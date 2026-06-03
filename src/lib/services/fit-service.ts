import { db } from "../db";
import { parseStringList, toJson } from "../utils";
import { recordAudit } from "../audit";
import { scoreFit, type JobContext } from "../llm";
import type { FitAnalysis } from "../llm/types";
import { fitAnalysisSchema } from "../llm/types";
import { toMockFacts } from "./facts";
import { getOrCreateProfile } from "./profile-service";
import { getSettings } from "./settings-service";

/** Build a JobContext from a stored JobPosting row. */
export function buildJobContext(job: {
  title: string;
  technologies: string | null;
  keywords: string | null;
  requiredQualifications: string | null;
  preferredQualifications: string | null;
  responsibilities: string | null;
  company?: { name: string } | null;
}): JobContext {
  return {
    company: job.company?.name,
    title: job.title,
    technologies: parseStringList(job.technologies),
    keywords: parseStringList(job.keywords),
    requiredQualifications: parseStringList(job.requiredQualifications),
    preferredQualifications: parseStringList(job.preferredQualifications),
    responsibilities: parseStringList(job.responsibilities),
  };
}

/** Compute a fit analysis for a job against the current profile (not persisted). */
export async function previewFit(jobId: string): Promise<FitAnalysis | null> {
  const job = await db.jobPosting.findUnique({ where: { id: jobId }, include: { company: true } });
  if (!job) return null;
  const profile = await getOrCreateProfile();
  const facts = await db.profileFact.findMany({ where: { userProfileId: profile.id } });
  const settings = await getSettings();
  const analysis = await scoreFit(toMockFacts(facts), buildJobContext(job), settings.llmProvider);
  return fitAnalysisSchema.parse(analysis);
}

/** Compute and PERSIST the fit analysis on an application. */
export async function analyzeFit(applicationId: string): Promise<FitAnalysis> {
  const application = await db.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: { jobPosting: { include: { company: true } } },
  });
  const facts = await db.profileFact.findMany({ where: { userProfileId: application.userProfileId } });
  const settings = await getSettings();
  const analysis = fitAnalysisSchema.parse(
    await scoreFit(toMockFacts(facts), buildJobContext(application.jobPosting), settings.llmProvider),
  );
  await db.application.update({
    where: { id: applicationId },
    data: { fitScore: analysis.fitScore, fitAnalysisJson: toJson(analysis) },
  });
  await recordAudit("Application", applicationId, "generate.fit", { fitScore: analysis.fitScore });
  return analysis;
}
