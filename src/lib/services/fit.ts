import type { JobPosting, ProfileFact } from "@prisma/client";
import { readJson, toList } from "../json";
import type { FitAnalysis } from "../schemas";
import { clamp } from "./shared";

export function calculateFit(job: JobPosting, facts: ProfileFact[]): FitAnalysis {
  const keywords = toList(job.keywords);
  const requirements = [...toList(job.requiredQualifications), ...toList(job.preferredQualifications)];
  const factText = facts.map((fact) => `${fact.title} ${fact.description} ${fact.impact ?? ""} ${fact.skills}`).join(" ").toLowerCase();
  const strongestEvidence = facts
    .flatMap((fact) =>
      keywords
        .filter((keyword) => `${fact.title} ${fact.description} ${fact.impact ?? ""} ${fact.skills}`.toLowerCase().includes(keyword.toLowerCase()))
        .map((keyword) => ({ requirement: keyword, factId: fact.id, factTitle: fact.title })),
    )
    .slice(0, 8);

  const matchedRequirements = requirements.filter((requirement) => factText.includes(requirement.toLowerCase()) || keywords.some((keyword) => factText.includes(keyword.toLowerCase())));
  const missingKeywords = keywords.filter((keyword) => !factText.includes(keyword.toLowerCase()));
  const riskFlags = readJson<string[]>(job.riskFlagsJson, []);
  const score = clamp(Math.round((strongestEvidence.length / Math.max(keywords.length, 1)) * 70 + (riskFlags.length ? -10 : 20)), 0, 100);

  return {
    fitScore: score,
    matchedRequirements,
    partiallyMatchedRequirements: strongestEvidence.map((item) => item.requirement),
    missingRequirements: missingKeywords,
    strongestEvidence,
    risks: riskFlags,
    recommendedResumeTemplate: job.title.toLowerCase().includes("data") ? "data_science" : job.title.toLowerCase().includes("software") ? "software_engineering" : "general_internship",
    suggestedPositioning: score >= 70 ? "Lead with directly matched project and internship evidence." : "Keep the application honest and add missing facts before making stronger claims.",
  };
}
