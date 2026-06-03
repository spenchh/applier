import { z } from "zod";
import type { GenerateOptions, LlmProvider } from "./provider";
import {
  extractTechnologies,
  extractEmails,
  extractDeadline,
  extractCompensation,
  guessCompanyAndTitle,
  splitLines,
} from "../text/extract";

/**
 * Deterministic, offline mock provider.
 *
 * It is intentionally "grounded": every generated bullet, answer, and cover
 * letter is derived ONLY from the facts/context passed in `options.context`. It
 * never invents skills, metrics, employers, or eligibility. This makes the demo
 * flow honest by construction and keeps the truth-check meaningful.
 */

export interface MockFact {
  id: string;
  type: string;
  title: string;
  organization?: string | null;
  location?: string | null;
  description?: string | null;
  impact?: string | null;
  skills: string[];
  resumeAllowed: boolean;
  coverLetterAllowed: boolean;
  answersAllowed: boolean;
}

function factText(f: MockFact): string {
  return [f.title, f.organization, f.description, f.impact, f.skills.join(" ")]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function allUserSkills(facts: MockFact[]): string[] {
  const set = new Set<string>();
  for (const f of facts) {
    for (const s of f.skills) set.add(s.toLowerCase());
    for (const t of extractTechnologies(factText(f))) set.add(t.toLowerCase());
  }
  return Array.from(set);
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9+.# ]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 2),
  );
}

const STOP = new Set([
  "the", "and", "for", "with", "you", "our", "are", "will", "have", "this", "that",
  "your", "from", "their", "they", "who", "what", "when", "how", "why", "all", "can",
  "experience", "work", "team", "using", "used", "use", "including", "such", "able",
]);

function contentTokens(text: string): Set<string> {
  const t = tokenize(text);
  for (const s of STOP) t.delete(s);
  return t;
}

/** Overlap-based support scoring of a claim against the user's facts. */
function scoreClaimSupport(
  claim: string,
  facts: MockFact[],
): { status: "supported" | "weak" | "unsupported"; factId?: string } {
  const claimTokens = contentTokens(claim);
  if (claimTokens.size === 0) return { status: "weak" };
  let best = { overlap: 0, factId: undefined as string | undefined };
  for (const f of facts) {
    const ft = contentTokens(factText(f));
    let overlap = 0;
    for (const tok of claimTokens) if (ft.has(tok)) overlap += 1;
    const ratio = overlap / claimTokens.size;
    if (ratio > best.overlap) best = { overlap: ratio, factId: f.id };
  }
  if (best.overlap >= 0.5) return { status: "supported", factId: best.factId };
  if (best.overlap >= 0.25) return { status: "weak", factId: best.factId };
  return { status: "unsupported", factId: undefined };
}

export class MockProvider implements LlmProvider {
  readonly name = "mock" as const;

  async generateText(_system: string, prompt: string, options?: GenerateOptions): Promise<string> {
    // The text path is only used for a couple of free-form helpers. Keep it
    // grounded and generic.
    const ctx = options?.context ?? {};
    if (options?.task === "recruiter-note" || prompt.toLowerCase().includes("recruiter")) {
      const profile = (ctx.profile as Record<string, string>) ?? {};
      const job = (ctx.job as Record<string, string>) ?? {};
      return (
        `Hi${job.recruiter ? " " + job.recruiter : ""},\n\n` +
        `I'm ${profile.name ?? "a student"} applying to the ${job.title ?? "internship"} role` +
        `${job.company ? " at " + job.company : ""}. ${profile.major ? `I'm studying ${profile.major}` : ""}` +
        ` and would welcome the chance to share how my background fits the team. Thank you for your time!`
      ).trim();
    }
    return "[mock] No text template configured for this task.";
  }

  async generateStructuredObject<T>(
    _system: string,
    _prompt: string,
    schema: z.ZodType<T, z.ZodTypeDef, unknown>,
    options?: GenerateOptions,
  ): Promise<T> {
    const ctx = options?.context ?? {};
    let result: unknown;
    switch (options?.task) {
      case "parseResume":
        result = this.parseResume(String(ctx.rawText ?? ""));
        break;
      case "parseJob":
        result = this.parseJob(String(ctx.rawText ?? ""), String(ctx.sourceUrl ?? ""));
        break;
      case "scoreFit":
        result = this.scoreFit(ctx);
        break;
      case "tailorResume":
        result = this.tailorResume(ctx);
        break;
      case "coverLetter":
        result = this.coverLetter(ctx);
        break;
      case "answers":
        result = this.answers(ctx);
        break;
      case "truthCheck":
        result = this.truthCheck(ctx);
        break;
      default:
        result = {};
    }
    // Parse through the schema so the mock obeys the same contract as real
    // providers (defaults fill anything we omitted).
    return schema.parse(result);
  }

  // ---- Task implementations ----------------------------------------------

  private parseResume(rawText: string) {
    const emails = extractEmails(rawText);
    const skills = extractTechnologies(rawText);
    const lines = splitLines(rawText);
    return {
      header: {
        name: lines[0]?.slice(0, 60) ?? "",
        email: emails[0] ?? "",
        phone: rawText.match(/(\+?\d[\d\s().-]{7,}\d)/)?.[1] ?? "",
        location: "",
        links: (rawText.match(/https?:\/\/[^\s)"']+/gi) ?? []).slice(0, 5),
      },
      summary: "",
      education: [],
      experience: [],
      projects: [],
      skills,
      awards: [],
    };
  }

  private parseJob(rawText: string, sourceUrl: string) {
    const { company, title } = guessCompanyAndTitle(rawText);
    const technologies = extractTechnologies(rawText);
    const emails = extractEmails(rawText);
    const lines = splitLines(rawText);

    // Naive section splitting for required/preferred/responsibilities.
    const required: string[] = [];
    const preferred: string[] = [];
    const responsibilities: string[] = [];
    let bucket: "req" | "pref" | "resp" | null = null;
    for (const raw of rawText.split(/\r?\n/)) {
      const line = raw.trim();
      const l = line.toLowerCase();
      if (/(requirement|required|qualif|must have|you have|minimum)/.test(l) && line.length < 60) {
        bucket = "req";
        continue;
      }
      if (/(preferred|nice to have|bonus|plus|a plus)/.test(l) && line.length < 60) {
        bucket = "pref";
        continue;
      }
      if (/(responsibilit|what you'?ll do|you will|role|day to day)/.test(l) && line.length < 60) {
        bucket = "resp";
        continue;
      }
      const cleaned = line.replace(/^[\s•\-*●▪]+/, "").trim();
      if (!cleaned || cleaned.length < 4) continue;
      if (/^[•\-*●▪]/.test(line) || bucket) {
        if (bucket === "req") required.push(cleaned);
        else if (bucket === "pref") preferred.push(cleaned);
        else if (bucket === "resp") responsibilities.push(cleaned);
      }
    }

    const workplaceType = /\bremote\b/i.test(rawText)
      ? "remote"
      : /\bhybrid\b/i.test(rawText)
        ? "hybrid"
        : /\b(on-?site|in office|in-person)\b/i.test(rawText)
          ? "onsite"
          : "";

    const term =
      rawText.match(/\b(summer|fall|spring|winter)\s*20\d{2}\b/i)?.[0] ??
      rawText.match(/\b20\d{2}\s*(summer|fall|spring|winter)\b/i)?.[0] ??
      "";

    const keywords = Array.from(
      new Set([...technologies, ...required.flatMap((r) => extractTechnologies(r))]),
    ).slice(0, 30);

    return {
      company,
      companyWebsite: "",
      title,
      location: rawText.match(/(?:location|based in)[:\s]+([A-Za-z ,]+)/i)?.[1]?.trim() ?? "",
      workplaceType,
      internshipTerm: term,
      deadline: extractDeadline(rawText),
      applicationEmail:
        emails.find((e) => /(careers|jobs|recruit|hr|talent|apply|hiring)/.test(e)) ?? emails[0] ?? "",
      compensation: extractCompensation(rawText),
      responsibilities: responsibilities.slice(0, 12),
      requiredQualifications: (required.length ? required : lines.filter((l) => /\b(experience|knowledge|familiar|proficien|pursuing|degree)\b/i.test(l))).slice(0, 12),
      preferredQualifications: preferred.slice(0, 12),
      technologies,
      keywords,
      // questions/riskFlags are merged in by the job-service (deterministic).
      questions: [],
      riskFlags: [],
      missingFields: [company === "Unknown Company" ? "company" : "", title === "Internship" ? "title" : ""].filter(Boolean),
    };
  }

  private scoreFit(ctx: Record<string, unknown>) {
    const facts = (ctx.facts as MockFact[]) ?? [];
    const job = (ctx.job as Record<string, unknown>) ?? {};
    const technologies = ((job.technologies as string[]) ?? []).map((t) => t.toLowerCase());
    const required = (job.requiredQualifications as string[]) ?? [];
    const preferred = (job.preferredQualifications as string[]) ?? [];
    const userSkills = new Set(allUserSkills(facts));

    const matchedTech = technologies.filter((t) => userSkills.has(t));
    const missingTech = technologies.filter((t) => !userSkills.has(t));

    const matched: string[] = [];
    const partiallyMatched: string[] = [];
    const missing: string[] = [];
    for (const req of required) {
      const reqTech = extractTechnologies(req).map((t) => t.toLowerCase());
      const hits = reqTech.filter((t) => userSkills.has(t));
      const isStudentReq = /\b(student|pursuing|enrolled|degree|bachelor|undergrad)\b/i.test(req);
      if (reqTech.length === 0 && isStudentReq) matched.push(req);
      else if (reqTech.length > 0 && hits.length === reqTech.length) matched.push(req);
      else if (hits.length > 0) partiallyMatched.push(req);
      else missing.push(req);
    }

    const techCoverage = technologies.length ? matchedTech.length / technologies.length : 0.6;
    const reqCoverage = required.length ? matched.length / required.length : techCoverage;
    const prefBonus =
      preferred.length > 0
        ? preferred.filter((p) => extractTechnologies(p).some((t) => userSkills.has(t.toLowerCase())))
            .length / preferred.length
        : 0;
    const fitScore = Math.max(
      5,
      Math.min(98, Math.round((reqCoverage * 0.6 + techCoverage * 0.3 + prefBonus * 0.1) * 100)),
    );

    // Strongest evidence: facts whose skills intersect job technologies.
    const strongestEvidence = facts
      .map((f) => {
        const overlap = f.skills.filter((s) => technologies.includes(s.toLowerCase()));
        return { f, overlap };
      })
      .filter((x) => x.overlap.length > 0)
      .sort((a, b) => b.overlap.length - a.overlap.length)
      .slice(0, 3)
      .map((x) => `${x.f.title}${x.overlap.length ? ` (${x.overlap.join(", ")})` : ""}`);

    const recommendedTemplate =
      technologies.some((t) => ["pandas", "numpy", "tensorflow", "pytorch", "machine learning", "statistics", "sql", "tableau"].includes(t))
        ? "data-science"
        : technologies.some((t) => ["react", "node.js", "nodejs", "typescript", "java", "go", "docker", "kubernetes"].includes(t))
          ? "software-engineering"
          : "general";

    return {
      fitScore,
      summary:
        fitScore >= 70
          ? "Strong alignment with the core requirements based on your stored facts."
          : fitScore >= 45
            ? "Partial alignment — emphasize your matched skills and address gaps honestly."
            : "Limited alignment from stored facts — consider whether to apply and add missing facts.",
      matched,
      partiallyMatched,
      missing,
      strongestEvidence,
      risks: missingTech.length > technologies.length / 2 && technologies.length > 0
        ? [`Many required technologies are not in your stored facts: ${missingTech.slice(0, 6).join(", ")}.`]
        : [],
      recommendedTemplate,
      suggestedPositioning:
        matchedTech.length > 0
          ? `Lead with your experience in ${matchedTech.slice(0, 3).join(", ")}.`
          : "Lead with your strongest project and relevant coursework.",
    };
  }

  private tailorResume(ctx: Record<string, unknown>) {
    const facts = (ctx.facts as MockFact[]) ?? [];
    const job = (ctx.job as Record<string, unknown>) ?? {};
    const technologies = ((job.technologies as string[]) ?? []).map((t) => t.toLowerCase());
    const required = (job.requiredQualifications as string[]) ?? [];
    const preferred = (job.preferredQualifications as string[]) ?? [];
    const profile = (ctx.profile as Record<string, string>) ?? {};

    const resumeFacts = facts.filter((f) => f.resumeAllowed);
    const userSkills = allUserSkills(resumeFacts);

    // Reorder skills so job-relevant ones appear first.
    const reorderedSkills = [
      ...userSkills.filter((s) => technologies.includes(s)),
      ...userSkills.filter((s) => !technologies.includes(s)),
    ];

    const experience = resumeFacts
      .filter((f) => ["experience", "leadership", "volunteer"].includes(f.type))
      .map((f) => ({
        title: f.title,
        organization: f.organization ?? "",
        location: f.location ?? "",
        startDate: "",
        endDate: "",
        bullets: [f.description, f.impact].filter(Boolean) as string[],
      }));

    const projects = resumeFacts
      .filter((f) => ["project", "hackathon"].includes(f.type))
      .map((f) => ({
        name: f.title,
        description: f.description ?? "",
        technologies: f.skills.filter((s) => technologies.includes(s.toLowerCase())).concat(
          f.skills.filter((s) => !technologies.includes(s.toLowerCase())),
        ),
        bullets: [f.impact].filter(Boolean) as string[],
      }));

    const education = resumeFacts
      .filter((f) => f.type === "education")
      .map((f) => ({
        school: f.organization ?? f.title,
        degree: f.title,
        field: profile.major ?? "",
        graduation: profile.graduation ?? "",
        gpa: profile.gpa ?? "",
        details: [f.description].filter(Boolean) as string[],
      }));

    // Bullet "changes" demonstrate tailoring while staying grounded: the
    // "after" bullet only restates facts that exist, surfacing relevant tech.
    const bulletChanges = resumeFacts
      .filter((f) => f.description)
      .slice(0, 5)
      .map((f) => {
        const relevant = f.skills.filter((s) => technologies.includes(s.toLowerCase()));
        return {
          before: f.description ?? "",
          after:
            relevant.length > 0
              ? `${f.description}${/\.$/.test(f.description ?? "") ? "" : "."} (relevant: ${relevant.join(", ")})`
              : (f.description ?? ""),
          supportingFactIds: [f.id],
          rationale:
            relevant.length > 0
              ? `Surfaces job-relevant skills (${relevant.join(", ")}) already present in this fact.`
              : "Kept as-is; no job-relevant keywords to surface without fabrication.",
        };
      });

    const requiredPresent = technologies.filter((t) => userSkills.includes(t));
    const missing = technologies.filter((t) => !userSkills.includes(t));
    const preferredPresent = preferred
      .flatMap((p) => extractTechnologies(p))
      .map((t) => t.toLowerCase())
      .filter((t) => userSkills.includes(t));

    return {
      structured: {
        header: {
          name: profile.name ?? "",
          email: profile.email ?? "",
          phone: profile.phone ?? "",
          location: profile.location ?? "",
          links: [profile.github, profile.portfolio, profile.linkedin].filter(Boolean),
        },
        summary: this.tailoredSummary(profile, requiredPresent),
        education,
        experience,
        projects,
        skills: reorderedSkills,
        awards: resumeFacts.filter((f) => f.type === "award").map((f) => f.title),
      },
      text: "", // rendered server-side from `structured` by the resume renderer
      summary: this.tailoredSummary(profile, requiredPresent),
      reorderedSkills,
      bulletChanges,
      supportingFactIds: resumeFacts.map((f) => f.id),
      // The mock never fabricates, so it produces no unsupported claims. Missing
      // requirements are reported via keyword coverage instead.
      unsupportedClaims: [],
      keywordCoverage: {
        requiredPresent: Array.from(new Set(requiredPresent)),
        preferredPresent: Array.from(new Set(preferredPresent)),
        missing: Array.from(new Set(missing)),
        // Missing required keywords are intentionally omitted because they are
        // unsupported by stored facts — we will not pad the resume with them.
        intentionallyOmitted: Array.from(new Set(missing)),
      },
    };
  }

  private tailoredSummary(profile: Record<string, string>, relevant: string[]): string {
    const who = profile.major ? `${profile.major} student` : "Student";
    const skills = relevant.length ? ` with project experience in ${relevant.slice(0, 4).join(", ")}` : "";
    return `${who}${profile.school ? ` at ${profile.school}` : ""}${skills}. Seeking an internship to contribute and grow.`;
  }

  private coverLetter(ctx: Record<string, unknown>) {
    const facts = (ctx.facts as MockFact[]) ?? [];
    const job = (ctx.job as Record<string, unknown>) ?? {};
    const profile = (ctx.profile as Record<string, string>) ?? {};
    const company = String(job.company ?? "your team");
    const title = String(job.title ?? "this internship");
    const technologies = ((job.technologies as string[]) ?? []).map((t) => t.toLowerCase());

    const clFacts = facts.filter((f) => f.coverLetterAllowed);
    // Pick the most relevant facts (skills intersect job tech), then by having impact.
    const ranked = clFacts
      .map((f) => ({
        f,
        score: f.skills.filter((s) => technologies.includes(s.toLowerCase())).length + (f.impact ? 1 : 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((x) => x.f);

    const bodyParas = ranked.map((f) => {
      const rel = f.skills.filter((s) => technologies.includes(s.toLowerCase()));
      return `In my work on ${f.title}${f.organization ? ` at ${f.organization}` : ""}, ${(f.description ?? "I developed relevant skills").replace(/\.$/, "")}.${
        f.impact ? ` ${f.impact}` : ""
      }${rel.length ? ` This gave me hands-on experience with ${rel.join(", ")}.` : ""}`;
    });

    const text = [
      `Dear ${company} Hiring Team,`,
      "",
      `I am excited to apply for the ${title} role. As a ${profile.major ?? "student"}${profile.school ? ` at ${profile.school}` : ""}, I am eager to contribute and learn.`,
      "",
      ...bodyParas.flatMap((p) => [p, ""]),
      `I would welcome the opportunity to discuss how my background fits ${company}. Thank you for your consideration.`,
      "",
      "Sincerely,",
      profile.name ?? "",
    ].join("\n");

    return {
      text,
      supportingFactIds: ranked.map((f) => f.id),
      unsupportedClaims: [], // grounded only in provided facts
    };
  }

  private answers(ctx: Record<string, unknown>) {
    const questions =
      (ctx.questions as { questionText: string; sensitive?: boolean; questionType?: string }[]) ?? [];
    const facts = (ctx.facts as MockFact[]) ?? [];
    const profile = (ctx.profile as Record<string, string>) ?? {};
    const job = (ctx.job as Record<string, unknown>) ?? {};
    const technologies = ((job.technologies as string[]) ?? []).map((t) => t.toLowerCase());

    const answers = questions.map((q) => this.answerOne(q, facts, profile, job, technologies));
    return { answers };
  }

  private answerOne(
    q: { questionText: string; sensitive?: boolean; questionType?: string },
    facts: MockFact[],
    profile: Record<string, string>,
    job: Record<string, unknown>,
    technologies: string[],
  ) {
    const text = q.questionText.toLowerCase();
    const usableFacts = facts.filter((f) => f.answersAllowed);
    const base = {
      questionText: q.questionText,
      answerText: "",
      supportingFactIds: [] as string[],
      confidence: "medium" as "high" | "medium" | "low",
      sensitive: Boolean(q.sensitive),
      needsUserInput: false,
      note: "",
    };

    // Demographic / self-identification — never auto-answer.
    if (q.questionType === "demographic" || /\b(gender|race|ethnicity|disab|veteran|sexual orientation|self-identif)\b/.test(text)) {
      return {
        ...base,
        sensitive: true,
        needsUserInput: true,
        confidence: "low" as const,
        note: "Voluntary self-identification question. InternPilot does not auto-answer these. Provide an answer yourself only if you choose to.",
      };
    }

    // Work authorization / eligibility — only from explicitly stored facts, and
    // always require per-application confirmation.
    if (q.questionType === "eligibility" || /\b(authorized to work|work authorization|require sponsorship|visa|citizen|eligible to work)\b/.test(text)) {
      const hasAuth = Boolean(profile.workAuthorization);
      const sponsorship = profile.sponsorshipRequired;
      let answer = "";
      if (/sponsor/.test(text) && sponsorship !== undefined) {
        answer = sponsorship === "true" ? "Yes, I would require sponsorship." : "No, I would not require sponsorship.";
      } else if (hasAuth) {
        answer = profile.workAuthorization;
      }
      return {
        ...base,
        sensitive: true,
        answerText: answer,
        needsUserInput: true,
        confidence: answer ? ("medium" as const) : ("low" as const),
        note: answer
          ? "Pre-filled from your stored eligibility facts. Confirm it is accurate for THIS application before submitting."
          : "No stored eligibility fact found. Enter your verified answer yourself.",
      };
    }

    // Availability / start date.
    if (/\b(available|availability|start date|when can you start|earliest)\b/.test(text)) {
      const start = profile.earliestStartDate;
      const terms = profile.preferredTerms;
      if (start || terms) {
        return {
          ...base,
          answerText: [start ? `I can start on ${start}.` : "", terms ? `Preferred term: ${terms}.` : ""].filter(Boolean).join(" "),
          confidence: "high" as const,
          note: "From your profile availability.",
        };
      }
      return { ...base, needsUserInput: true, note: "Add your earliest start date to your profile." };
    }

    // Tell us about yourself.
    if (/\b(about yourself|tell us about you|introduce yourself|who are you)\b/.test(text)) {
      const top = this.rankFacts(usableFacts, technologies).slice(0, 2);
      if (top.length === 0) return { ...base, needsUserInput: true, note: "Add experience or project facts to generate this." };
      return {
        ...base,
        answerText:
          `I'm a ${profile.major ?? "student"}${profile.school ? ` at ${profile.school}` : ""}. ` +
          top.map((f) => `Through ${f.title}${f.organization ? ` at ${f.organization}` : ""}, ${(f.description ?? "I built relevant skills").replace(/\.$/, "")}.`).join(" "),
        supportingFactIds: top.map((f) => f.id),
        confidence: "high" as const,
        note: "Grounded in your stored facts. Edit to match your voice.",
      };
    }

    // Relevant project.
    if (/\b(relevant project|a project|describe a project|technical project)\b/.test(text)) {
      const project = this.rankFacts(usableFacts.filter((f) => ["project", "hackathon", "experience"].includes(f.type)), technologies)[0];
      if (!project) return { ...base, needsUserInput: true, note: "Add a project fact to generate this." };
      const rel = project.skills.filter((s) => technologies.includes(s.toLowerCase()));
      return {
        ...base,
        answerText: `${project.title}${project.organization ? ` (${project.organization})` : ""}: ${project.description ?? ""}${project.impact ? ` ${project.impact}` : ""}${rel.length ? ` Technologies: ${rel.join(", ")}.` : ""}`.trim(),
        supportingFactIds: [project.id],
        confidence: "high" as const,
        note: "From your strongest job-relevant project.",
      };
    }

    // Why this company — genuine motivation is user-specific. Checked BEFORE
    // "why this role" so "why do you want to work at <company>" routes here.
    const company = String(job.company ?? "");
    const mentionsCompany =
      /\b(company|organization|work (?:at|for|here)|mission|team|us)\b/.test(text) ||
      (company && text.includes(company.toLowerCase()));
    if (/\b(why|interested|excited|drawn)\b/.test(text) && mentionsCompany && !/\brole\b/.test(text)) {
      return {
        ...base,
        answerText: `I'm drawn to ${company || "your company"} and the ${String(job.title ?? "internship")} role because it matches my interests and skills.`,
        confidence: "low" as const,
        needsUserInput: true,
        note: `Add specific, genuine reasons you want to work at ${company || "this company"} (mission, products, team). Do not fabricate.`,
      };
    }

    // Why this role.
    if (/\bwhy (?:this |the )?role\b|why (?:do you want|are you interested)|interested in (?:this|the) (?:role|position|internship)/.test(text)) {
      const top = this.rankFacts(usableFacts, technologies).slice(0, 2);
      const matched = technologies.filter((t) => allUserSkills(usableFacts).includes(t));
      return {
        ...base,
        answerText: `This role aligns with my experience${matched.length ? ` in ${matched.slice(0, 3).join(", ")}` : ""}. ${top[0] ? `Working on ${top[0].title} showed me I enjoy this kind of problem.` : ""} I'm eager to deepen these skills as an intern.`.trim(),
        supportingFactIds: top.map((f) => f.id),
        confidence: top.length ? ("medium" as const) : ("low" as const),
        needsUserInput: top.length === 0,
        note: "Edit to add your specific motivation.",
      };
    }

    // Generic: attempt a grounded answer, else flag for input.
    const top = this.rankFacts(usableFacts, technologies).slice(0, 2);
    if (top.length === 0) {
      return { ...base, needsUserInput: true, confidence: "low" as const, note: "No stored facts clearly map to this question — answer it yourself." };
    }
    return {
      ...base,
      answerText: top.map((f) => `${f.title}: ${f.description ?? ""}`.trim()).join(" "),
      supportingFactIds: top.map((f) => f.id),
      confidence: "low" as const,
      needsUserInput: true,
      note: "Draft from related facts — review and tailor to the exact question.",
    };
  }

  private rankFacts(facts: MockFact[], technologies: string[]): MockFact[] {
    return [...facts].sort((a, b) => {
      const sa = a.skills.filter((s) => technologies.includes(s.toLowerCase())).length + (a.impact ? 1 : 0);
      const sb = b.skills.filter((s) => technologies.includes(s.toLowerCase())).length + (b.impact ? 1 : 0);
      return sb - sa;
    });
  }

  private truthCheck(ctx: Record<string, unknown>) {
    const claims = (ctx.claims as string[]) ?? [];
    const facts = (ctx.facts as MockFact[]) ?? [];
    const supported: { text: string; supportingFactIds: string[]; status: "supported"; note: string }[] = [];
    const weak: { text: string; supportingFactIds: string[]; status: "weak"; note: string }[] = [];
    const unsupported: { text: string; supportingFactIds: string[]; status: "unsupported"; note: string }[] = [];

    for (const claim of claims) {
      const { status, factId } = scoreClaimSupport(claim, facts);
      const entry = { text: claim, supportingFactIds: factId ? [factId] : [], note: "" };
      if (status === "supported") supported.push({ ...entry, status });
      else if (status === "weak")
        weak.push({ ...entry, status, note: "Partially supported — tighten wording to match your stored fact." });
      else unsupported.push({ ...entry, status, note: "No stored fact supports this claim. Remove it or add a verified fact." });
    }

    return {
      supported,
      weak,
      unsupported,
      missingFacts: unsupported.map((u) => `A fact supporting: "${u.text.slice(0, 80)}"`),
      recommendedEdits: unsupported.length
        ? ["Remove or revise unsupported claims before approving this packet."]
        : weak.length
          ? ["Tighten weakly-supported claims to match your stored facts."]
          : [],
    };
  }
}
