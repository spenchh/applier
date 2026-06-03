"use server";

import { revalidatePath } from "next/cache";
import { settingsSchema } from "../validation/schemas";
import { updateSettings } from "../services/settings-service";
import { db } from "../db";
import { recordAudit } from "../audit";
import type { ActionState } from "./profile-actions";

export type { ActionState } from "./profile-actions";

export async function saveSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = settingsSchema.safeParse({
    ...raw,
    submissionAdaptersDisabled: raw.submissionAdaptersDisabled === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  await updateSettings(parsed.data);
  revalidatePath("/settings");
  return { ok: true, message: "Settings saved." };
}

/** Export all user data as JSON (privacy / portability control). */
export async function exportDataAction(): Promise<ActionState> {
  // Returns a message; the actual file export is handled by the /api/export route.
  return { ok: true, message: "Use the Download button to export your data as JSON." };
}

/** Danger zone: delete ALL data. Requires explicit confirmation in the UI. */
export async function deleteAllDataAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== "DELETE") {
    return { ok: false, error: 'Type DELETE to confirm.' };
  }
  await db.$transaction([
    db.auditLog.deleteMany(),
    db.submissionAttempt.deleteMany(),
    db.followUpTask.deleteMany(),
    db.applicationAnswer.deleteMany(),
    db.coverLetter.deleteMany(),
    db.resumeVersion.deleteMany(),
    db.fileAsset.deleteMany(),
    db.application.deleteMany(),
    db.jobQuestion.deleteMany(),
    db.jobPosting.deleteMany(),
    db.company.deleteMany(),
    db.resume.deleteMany(),
    db.profileFact.deleteMany(),
    db.userProfile.deleteMany(),
  ]);
  await recordAudit("AppSettings", "singleton", "delete.all-data", {});
  revalidatePath("/");
  return { ok: true, message: "All application data deleted." };
}
