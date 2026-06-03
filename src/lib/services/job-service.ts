import { db } from "../db";
import { toJson, parseJson } from "../utils";
import { recordAudit } from "../audit";
import { parseJobPosting } from "../llm";
import type { ParsedJob, RiskFlag } from "../llm/types";
import { detectRiskFlags } from "../text/extract";
import { planUrlImport } from "../url";
import { adapterForImport } from "../adapters/registry";
import { dedupeHash, findDuplicate } from "./dedupe";
import { getSettings } from "./settings-service";

export interface ImportResult {
  status: "imported" | "needs-paste" | "restricted" | "duplicate";
  jobId?: string;
  duplicateOfId?: string;
  rawText?: string;
  note: string;
  forceManual?: boolean;
  atsProvider?: string;
}

/**
 * Attempt to import a job from a URL. Restricted platforms NEVER get scraped —
 * we return their metadata and force Manual Mode. Known ATS hosts attempt their
 * official/public API; on failure we ask the user to paste the description.
 */
export async function importJobFromUrl(url: string, sourceName?: string): Promise<ImportResult> {
  const plan = planUrlImport(url);

  if (plan.restricted) {
    return {
      status: "restricted",
      note: plan.reason,
      forceManual: true,
      atsProvider: plan.atsProvider,
      rawText: "",
    };
  }

  const adapter = adapterForImport(url);
  const imported = await adapter.importJob({ url, sourceName });

  if (imported.imported && imported.rawText) {
    const job = await createJobFromText(imported.rawText, {
      sourceUrl: imported.sourceUrl ?? url,
      sourceName: sourceName ?? plan.host ?? undefined,
      atsProvider: imported.atsProvider ?? plan.atsProvider,
    });
    if (job.duplicateOfId) {
      return { status: "duplicate", duplicateOfId: job.duplicateOfId, note: "This job looks like a duplicate of one you already imported.", jobId: job.duplicateOfId };
    }
    return { status: "imported", jobId: job.id, note: imported.note ?? plan.reason, atsProvider: imported.atsProvider };
  }

  return {
    status: "needs-paste",
    note: imported.note ?? plan.reason,
    forceManual: imported.forceManual,
    atsProvider: imported.atsProvider ?? plan.atsProvider,
  };
}

export interface CreateJobOptions {
  sourceUrl?: string;
  sourceName?: string;
  atsProvider?: string;
}

/**
 * Parse raw job text via the LLM, run deterministic risk detection, dedupe, and
 * persist Company + JobPosting + JobQuestions.
 */
export async function createJobFromText(rawText: string, options: CreateJobOptions = {}) {
  const settings = await getSettings();
  const parsed = await parseJobPosting(rawText, options.sourceUrl ?? "", settings.llmProvider);

  // Deterministic risk detection ALWAYS runs and is merged with any LLM flags.
  const deterministicFlags = detectRiskFlags(rawText, {
    companyWebsite: parsed.companyWebsite,
    sourceUrl: options.sourceUrl,
    emails: parsed.applicationEmail ? [parsed.applicationEmail] : [],
    compensation: parsed.compensation,
  });
  const riskFlags = mergeRiskFlags(deterministicFlags, parsed.riskFlags);

  // Dedupe check.
  const hash = dedupeHash({
    company: parsed.company,
    title: parsed.title,
    location: parsed.location,
    sourceUrl: options.sourceUrl,
  });
  const existing = await db.jobPosting.findMany({
    select: { id: true, dedupeHash: true, rawDescription: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const dup = findDuplicate({ hash, description: rawText }, existing);
  if (dup) {
    return { id: dup.id, duplicateOfId: dup.id, parsed, riskFlags };
  }

  const company = await upsertCompany(parsed.company, parsed.companyWebsite);

  const job = await db.jobPosting.create({
    data: {
      companyId: company.id,
      title: parsed.title || "Internship",
      location: parsed.location || null,
      workplaceType: parsed.workplaceType || null,
      internshipTerm: parsed.internshipTerm || null,
      sourceUrl: options.sourceUrl || null,
      sourceName: options.sourceName || null,
      atsProvider: options.atsProvider || "unknown",
      rawDescription: rawText,
      parsedJson: toJson(parsed),
      requiredQualifications: toJson(parsed.requiredQualifications),
      preferredQualifications: toJson(parsed.preferredQualifications),
      responsibilities: toJson(parsed.responsibilities),
      technologies: toJson(parsed.technologies),
      keywords: toJson(parsed.keywords),
      compensation: parsed.compensation || null,
      deadline: parseDeadline(parsed.deadline),
      riskFlagsJson: toJson(riskFlags),
      dedupeHash: hash,
      questions: {
        create: parsed.questions.map((q) => ({
          questionText: q.questionText,
          questionType: q.questionType,
          required: q.required,
          optionsJson: q.options.length ? toJson(q.options) : null,
          sensitive: q.sensitive || q.questionType === "demographic" || q.questionType === "eligibility",
        })),
      },
    },
  });
  await recordAudit("JobPosting", job.id, "create.job", {
    company: company.name,
    riskFlags: riskFlags.length,
    questions: parsed.questions.length,
  });
  return { id: job.id, duplicateOfId: null as string | null, parsed, riskFlags };
}

export interface ManualJobInput {
  company: string;
  title: string;
  location?: string;
  workplaceType?: string;
  internshipTerm?: string;
  sourceUrl?: string;
  sourceName?: string;
  deadline?: string;
  compensation?: string;
  description?: string;
}

/** Create a job from manually-entered fields (still parsed for keywords/risk). */
export async function createJobManual(input: ManualJobInput) {
  const text = [
    `Company: ${input.company}`,
    `Role: ${input.title}`,
    input.location ? `Location: ${input.location}` : "",
    input.description ?? "",
  ]
    .filter(Boolean)
    .join("\n");
  return createJobFromText(input.description ? text : text, {
    sourceUrl: input.sourceUrl,
    sourceName: input.sourceName || "manual",
  });
}

/** Import multiple jobs from CSV text. Expected headers (case-insensitive): */
/** company,title,location,url,deadline,description  (description optional).  */
export async function importJobsFromCsv(csv: string) {
  const rows = parseCsv(csv);
  if (rows.length === 0) return { created: 0, duplicates: 0, errors: ["No rows found."] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  const ci = { company: idx("company"), title: idx("title"), location: idx("location"), url: idx("url"), deadline: idx("deadline"), description: idx("description") };

  let created = 0;
  let duplicates = 0;
  const errors: string[] = [];
  for (const row of rows.slice(1)) {
    const company = ci.company >= 0 ? row[ci.company]?.trim() : "";
    const title = ci.title >= 0 ? row[ci.title]?.trim() : "";
    if (!company || !title) {
      errors.push(`Skipped row (missing company/title): ${row.slice(0, 2).join(", ")}`);
      continue;
    }
    const description = ci.description >= 0 ? row[ci.description]?.trim() : "";
    const text = [
      `Company: ${company}`,
      `Role: ${title}`,
      ci.location >= 0 && row[ci.location] ? `Location: ${row[ci.location]}` : "",
      ci.deadline >= 0 && row[ci.deadline] ? `Apply by ${row[ci.deadline]}` : "",
      description,
    ]
      .filter(Boolean)
      .join("\n");
    const result = await createJobFromText(text, {
      sourceUrl: ci.url >= 0 ? row[ci.url]?.trim() : undefined,
      sourceName: "csv",
    });
    if (result.duplicateOfId) duplicates += 1;
    else created += 1;
  }
  return { created, duplicates, errors };
}

// ---- helpers --------------------------------------------------------------

async function upsertCompany(name: string, website?: string) {
  const cleanName = name?.trim() || "Unknown Company";
  const existing = await db.company.findFirst({ where: { name: cleanName } });
  if (existing) {
    if (website && !existing.website) {
      return db.company.update({ where: { id: existing.id }, data: { website } });
    }
    return existing;
  }
  let domain: string | null = null;
  try {
    domain = website ? new URL(website).hostname.replace(/^www\./, "") : null;
  } catch {
    domain = null;
  }
  return db.company.create({ data: { name: cleanName, website: website || null, domain } });
}

function mergeRiskFlags(deterministic: RiskFlag[], llm: RiskFlag[]): RiskFlag[] {
  const byCode = new Map<string, RiskFlag>();
  for (const f of [...deterministic, ...llm]) {
    if (!byCode.has(f.code)) byCode.set(f.code, f);
  }
  return Array.from(byCode.values());
}

function parseDeadline(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Minimal RFC-4180-ish CSV parser (handles quotes and embedded commas). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((f) => f.trim() !== "")) rows.push(row);
  }
  return rows;
}

export function getParsedJob(job: { parsedJson: string | null }): ParsedJob | null {
  return parseJson<ParsedJob | null>(job.parsedJson, null);
}
