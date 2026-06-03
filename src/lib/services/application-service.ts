import { db } from "../db";
import { toJson } from "../utils";
import { recordAudit } from "../audit";
import { startOfDay, endOfDay } from "date-fns";
import {
  APPLICATION_STATUSES,
  type ApplicationStatus,
  type ApplicationMode,
} from "../constants";
import { adapterForSubmission } from "../adapters/registry";
import { getSettings } from "./settings-service";
import { getOrCreateProfile } from "./profile-service";

export async function getOrCreateApplication(jobId: string) {
  const profile = await getOrCreateProfile();
  const existing = await db.application.findFirst({
    where: { jobPostingId: jobId, userProfileId: profile.id },
  });
  if (existing) return existing;
  const created = await db.application.create({
    data: { jobPostingId: jobId, userProfileId: profile.id, status: "saved" },
  });
  await recordAudit("Application", created.id, "create.application", { jobId });
  return created;
}

export async function getApplicationFull(id: string) {
  return db.application.findUnique({
    where: { id },
    include: {
      jobPosting: { include: { company: true, questions: true } },
      userProfile: true,
      answers: true,
      coverLetters: true,
      resumeVersions: true,
      attempts: { orderBy: { createdAt: "desc" } },
      followUps: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function listApplications(statuses?: ApplicationStatus[]) {
  return db.application.findMany({
    where: statuses?.length ? { status: { in: statuses } } : undefined,
    include: { jobPosting: { include: { company: true } }, answers: true, coverLetters: true, resumeVersions: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function setApplicationMode(id: string, mode: ApplicationMode) {
  return db.application.update({ where: { id }, data: { applicationMode: mode } });
}

export async function setApplicationStatus(id: string, status: ApplicationStatus) {
  if (!APPLICATION_STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`);
  const current = await db.application.findUniqueOrThrow({ where: { id } });
  const updated = await db.application.update({
    where: { id },
    data: {
      status,
      // Stamp the submission time the first time it enters "submitted".
      ...(status === "submitted" && !current.submittedAt ? { submittedAt: new Date() } : {}),
    },
  });
  await recordAudit("Application", id, "status.change", { status });
  return updated;
}

export async function updateApplicationFields(
  id: string,
  data: {
    notes?: string;
    referralContact?: string;
    recruiterContact?: string;
    followUpDate?: string | null;
    outcome?: string;
    deadline?: string | null;
  },
) {
  return db.application.update({
    where: { id },
    data: {
      notes: data.notes,
      referralContact: data.referralContact,
      recruiterContact: data.recruiterContact,
      outcome: data.outcome,
      followUpDate: data.followUpDate ? new Date(data.followUpDate) : data.followUpDate === null ? null : undefined,
    },
  });
}

/** Edit a single generated answer (user override). Recomputes truth status. */
export async function updateAnswer(answerId: string, answerText: string, approved?: boolean) {
  const answer = await db.applicationAnswer.findUniqueOrThrow({ where: { id: answerId } });
  return db.applicationAnswer.update({
    where: { id: answerId },
    data: {
      answerText,
      userApproved: approved ?? answer.userApproved,
      // A user-edited answer is treated as user-owned input.
      needsUserInput: false,
    },
  });
}

export async function updateCoverLetter(applicationId: string, text: string) {
  const existing = await db.coverLetter.findFirst({ where: { applicationId } });
  if (existing) {
    return db.coverLetter.update({ where: { id: existing.id }, data: { text } });
  }
  return db.coverLetter.create({ data: { applicationId, text } });
}

/**
 * Approve the packet. Sets approvedAt + status "approved" and marks the
 * generated artifacts user-approved. Unsupported claims do not hard-block, but
 * the UI surfaces them prominently before this is called.
 */
export async function approvePacket(applicationId: string) {
  const app = await db.application.update({
    where: { id: applicationId },
    data: { status: "approved", approvedAt: new Date() },
  });
  await db.applicationAnswer.updateMany({ where: { applicationId }, data: { userApproved: true } });
  await db.coverLetter.updateMany({ where: { applicationId }, data: { userApproved: true } });
  await recordAudit("Application", applicationId, "approve.application", {});
  return app;
}

export interface SubmitResult {
  ok: boolean;
  message: string;
  adapter: string;
  status: string;
  warning?: string;
}

/**
 * Submit / export an application. This is the single enforcement point for the
 * human-in-the-loop guarantee:
 *   - When review is required (always, locked on), the application MUST be
 *     approved first.
 *   - The user MUST pass `confirmedAccurate` (the final review checkbox).
 *   - Adapter submission is only attempted when adapters are enabled and
 *     configured; otherwise it falls back to Manual Mode.
 */
export async function submitApplication(
  applicationId: string,
  confirmedAccurate: boolean,
): Promise<SubmitResult> {
  const settings = await getSettings();
  const app = await db.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: { jobPosting: true },
  });

  if (settings.requireReviewBeforeSubmission && !app.approvedAt) {
    throw new Error("This application must be reviewed and approved before it can be submitted.");
  }
  if (!confirmedAccurate) {
    throw new Error("You must confirm you reviewed the application and the information is accurate.");
  }

  // Resolve the adapter; disabled/unconfigured adapters fall back to Manual.
  let mode = app.applicationMode as ApplicationMode;
  if (mode === "adapter" && settings.submissionAdaptersDisabled) {
    mode = "manual";
  }
  const adapter = adapterForSubmission(mode, app.jobPosting.atsProvider);
  const validation = await adapter.validateApplication(app);
  const result = await adapter.submitApplication(app);

  // Record a sanitized submission attempt.
  await db.submissionAttempt.create({
    data: {
      applicationId,
      adapter: adapter.provider,
      status: result.status,
      requestSummaryJson: toJson(result.requestSummary ?? {}),
      responseSummaryJson: toJson(result.responseSummary ?? {}),
      errorMessage: result.errorMessage ?? null,
    },
  });

  // For manual/email/fallback outcomes, the user is asserting the application
  // was (or will be) submitted via the employer's own system.
  const markSubmitted = ["success", "pending", "exported", "fallback", "duplicate"].includes(result.status);
  if (markSubmitted) {
    await db.application.update({
      where: { id: applicationId },
      data: { status: "submitted", submittedAt: new Date(), source: adapter.provider },
    });
  }

  await recordAudit("Application", applicationId, "submit.application", {
    adapter: adapter.provider,
    status: result.status,
    mode,
  });

  // Quality-control soft cap (never a hard block; tracking-only).
  const warning = await dailyCapWarning(settings.maxApplicationsPerDay);

  return {
    ok: markSubmitted,
    message: result.message + (validation.warnings.length ? ` (${validation.warnings.join("; ")})` : ""),
    adapter: adapter.provider,
    status: result.status,
    warning,
  };
}

async function dailyCapWarning(max: number): Promise<string | undefined> {
  const count = await db.application.count({
    where: { submittedAt: { gte: startOfDay(new Date()), lte: endOfDay(new Date()) } },
  });
  if (count >= max) {
    return `You've marked ${count} applications submitted today (quality-control cap: ${max}). Consider slowing down to keep each application tailored.`;
  }
  return undefined;
}

// ---- Follow-up tasks ------------------------------------------------------

export async function createFollowUp(applicationId: string, title: string, dueDate?: string, notes?: string) {
  return db.followUpTask.create({
    data: { applicationId, title, dueDate: dueDate ? new Date(dueDate) : null, notes: notes || null },
  });
}

export async function toggleFollowUp(id: string, completed: boolean) {
  return db.followUpTask.update({ where: { id }, data: { completed } });
}

export async function deleteApplication(id: string) {
  await db.application.delete({ where: { id } });
  await recordAudit("Application", id, "delete.application", {});
}
