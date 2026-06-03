import { prisma } from "../db";
import { writeJson } from "../json";
import { parseJobPostingMock } from "../llm";
import { chooseApplicationMode } from "../adapters";
import { dedupeHash, detectAtsProvider, isRestrictedPlatform } from "../text";

export async function createJobFromInput(input: {
  sourceUrl?: string | null;
  sourceName?: string | null;
  company?: string | null;
  title?: string | null;
  location?: string | null;
  rawDescription: string;
}) {
  const parsed = parseJobPostingMock(input);
  const hash = dedupeHash({
    company: parsed.company,
    title: parsed.title,
    location: parsed.location,
    sourceUrl: input.sourceUrl,
    rawDescription: input.rawDescription,
  });
  const existing = await prisma.jobPosting.findFirst({
    where: { dedupeHash: hash },
    include: { company: true, questions: true },
  });
  if (existing) return existing;

  const company = await prisma.company.upsert({
    where: { id: await companyIdForName(parsed.company) },
    update: { name: parsed.company },
    create: { id: await companyIdForName(parsed.company), name: parsed.company },
  });

  const mode = chooseApplicationMode(input.sourceUrl);
  const atsProvider = isRestrictedPlatform(input.sourceUrl) ? null : detectAtsProvider(input.sourceUrl);
  const job = await prisma.jobPosting.create({
    data: {
      companyId: company.id,
      title: parsed.title,
      location: parsed.location ?? null,
      workplaceType: parsed.workplaceType ?? null,
      internshipTerm: parsed.internshipTerm ?? null,
      sourceUrl: input.sourceUrl || null,
      sourceName: input.sourceName || null,
      atsProvider,
      rawDescription: input.rawDescription,
      parsedJson: writeJson(parsed),
      requiredQualifications: writeJson(parsed.requiredQualifications),
      preferredQualifications: writeJson(parsed.preferredQualifications),
      responsibilities: writeJson(parsed.responsibilities),
      technologies: writeJson(parsed.technologies),
      keywords: writeJson(parsed.keywords),
      riskFlagsJson: writeJson(parsed.riskFlags),
      dedupeHash: hash,
      questions: {
        create: parsed.applicationQuestions.map((question) => ({
          questionText: question.questionText,
          questionType: question.questionType,
          required: question.required,
          sensitive: question.sensitive,
        })),
      },
    },
    include: { company: true, questions: true },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "JobPosting",
      entityId: job.id,
      action: "job.import",
      metadataJson: writeJson({ mode, restricted: isRestrictedPlatform(input.sourceUrl), sourceUrl: input.sourceUrl }),
    },
  });

  return job;
}

export async function listJobs() {
  return prisma.jobPosting.findMany({
    include: {
      company: true,
      applications: true,
      questions: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getJob(id: string) {
  return prisma.jobPosting.findUnique({
    where: { id },
    include: {
      company: true,
      questions: true,
      applications: {
        include: {
          resumeVersions: true,
          coverLetters: true,
          answers: true,
        },
      },
    },
  });
}

async function companyIdForName(name: string) {
  const crypto = await import("node:crypto");
  return `company_${crypto.createHash("sha1").update(name.toLowerCase()).digest("hex").slice(0, 16)}`;
}
