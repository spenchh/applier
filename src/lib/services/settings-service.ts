import { db } from "../db";
import { env } from "../env";
import { recordAudit } from "../audit";

/**
 * Single-row app settings. `requireReviewBeforeSubmission` is locked ON and the
 * update path refuses to disable it — the human-in-the-loop guarantee is not
 * user-configurable.
 */
export async function getSettings() {
  const existing = await db.appSettings.findUnique({ where: { id: "singleton" } });
  if (existing) return existing;
  return db.appSettings.create({
    data: {
      id: "singleton",
      llmProvider: env.llmProvider,
    },
  });
}

export interface SettingsInput {
  llmProvider?: string;
  defaultResumeTemplate?: string;
  submissionAdaptersDisabled?: boolean;
  maxApplicationsPerDay?: number;
}

export async function updateSettings(input: SettingsInput) {
  const current = await getSettings();
  const updated = await db.appSettings.update({
    where: { id: current.id },
    data: {
      llmProvider: input.llmProvider ?? current.llmProvider,
      defaultResumeTemplate: input.defaultResumeTemplate ?? current.defaultResumeTemplate,
      // Locked on — can never be turned off.
      requireReviewBeforeSubmission: true,
      submissionAdaptersDisabled:
        input.submissionAdaptersDisabled ?? current.submissionAdaptersDisabled,
      maxApplicationsPerDay:
        input.maxApplicationsPerDay ?? current.maxApplicationsPerDay,
    },
  });
  await recordAudit("AppSettings", current.id, "update.settings", {
    llmProvider: updated.llmProvider,
    submissionAdaptersDisabled: updated.submissionAdaptersDisabled,
  });
  return updated;
}
