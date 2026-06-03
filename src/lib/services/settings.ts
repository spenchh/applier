import { prisma } from "../db";
import { ensureDatabaseReady } from "../runtime-db";

export async function getSettings() {
  await ensureDatabaseReady();
  return prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton", defaultResumeTemplate: "general_internship" },
  });
}

export async function updateSettings(input: {
  llmProvider?: string;
  aiModel?: string;
  aiInstructions?: string;
  defaultResumeTemplate?: string;
  targetRoleTypes?: string[];
  targetIndustries?: string[];
  excludedKeywords?: string[];
  disableSubmissionAdapters?: boolean;
  maxApplicationsPerDay?: number;
}) {
  await ensureDatabaseReady();
  return prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {
      llmProvider: input.llmProvider ?? "mock",
      aiModel: input.aiModel || null,
      aiInstructions: input.aiInstructions || null,
      defaultResumeTemplate: input.defaultResumeTemplate ?? "software_engineering",
      targetRoleTypes: JSON.stringify(input.targetRoleTypes ?? []),
      targetIndustries: JSON.stringify(input.targetIndustries ?? []),
      excludedKeywords: JSON.stringify(input.excludedKeywords ?? []),
      disableSubmissionAdapters: input.disableSubmissionAdapters ?? false,
      requireReview: true,
      maxApplicationsPerDay: input.maxApplicationsPerDay ?? 10,
    },
    create: {
      id: "singleton",
      llmProvider: input.llmProvider ?? "mock",
      aiModel: input.aiModel || null,
      aiInstructions: input.aiInstructions || null,
      defaultResumeTemplate: input.defaultResumeTemplate ?? "software_engineering",
      targetRoleTypes: JSON.stringify(input.targetRoleTypes ?? []),
      targetIndustries: JSON.stringify(input.targetIndustries ?? []),
      excludedKeywords: JSON.stringify(input.excludedKeywords ?? []),
      disableSubmissionAdapters: input.disableSubmissionAdapters ?? false,
      requireReview: true,
      maxApplicationsPerDay: input.maxApplicationsPerDay ?? 10,
    },
  });
}
