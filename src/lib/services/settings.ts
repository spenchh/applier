import { prisma } from "../db";

export async function getSettings() {
  return prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

export async function updateSettings(input: {
  llmProvider?: string;
  defaultResumeTemplate?: string;
  disableSubmissionAdapters?: boolean;
  maxApplicationsPerDay?: number;
}) {
  return prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: {
      llmProvider: input.llmProvider ?? "mock",
      defaultResumeTemplate: input.defaultResumeTemplate ?? "software_engineering",
      disableSubmissionAdapters: input.disableSubmissionAdapters ?? false,
      requireReview: true,
      maxApplicationsPerDay: input.maxApplicationsPerDay ?? 10,
    },
    create: {
      id: "singleton",
      llmProvider: input.llmProvider ?? "mock",
      defaultResumeTemplate: input.defaultResumeTemplate ?? "software_engineering",
      disableSubmissionAdapters: input.disableSubmissionAdapters ?? false,
      requireReview: true,
      maxApplicationsPerDay: input.maxApplicationsPerDay ?? 10,
    },
  });
}
