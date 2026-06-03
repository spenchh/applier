"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  getOrCreateApplication,
  approvePacket,
  submitApplication,
  setApplicationStatus,
  setApplicationMode,
  updateAnswer,
  updateCoverLetter,
  updateApplicationFields,
  createFollowUp,
  toggleFollowUp,
  deleteApplication,
} from "../services/application-service";
import { generatePacket } from "../services/tailor-service";
import { analyzeFit } from "../services/fit-service";
import { statusSchema } from "../validation/schemas";
import type { ApplicationStatus, ApplicationMode } from "../constants";
import type { ActionState } from "./profile-actions";

export type { ActionState } from "./profile-actions";

/** Start tailoring a job: ensure an application exists, analyze fit, go to studio. */
export async function startTailoringAction(formData: FormData): Promise<void> {
  const jobId = String(formData.get("jobId") ?? "");
  if (!jobId) return;
  const app = await getOrCreateApplication(jobId);
  await analyzeFit(app.id);
  redirect(`/applications/${app.id}/tailor`);
}

export async function generatePacketAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const includeCoverLetter = formData.get("includeCoverLetter") !== "off";
  if (!applicationId) return { ok: false, error: "Missing application." };
  try {
    await generatePacket(applicationId, { includeCoverLetter });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidatePath(`/applications/${applicationId}/tailor`);
  revalidatePath("/review");
  return { ok: true, message: "Packet generated. Review the truth-check and keyword coverage below." };
}

export async function updateAnswerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("answerId") ?? "");
  const text = String(formData.get("answerText") ?? "");
  const applicationId = String(formData.get("applicationId") ?? "");
  if (!id) return { ok: false, error: "Missing answer." };
  await updateAnswer(id, text, true);
  revalidatePath(`/applications/${applicationId}/tailor`);
  return { ok: true, message: "Answer saved." };
}

export async function updateCoverLetterAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const text = String(formData.get("text") ?? "");
  if (!applicationId) return { ok: false, error: "Missing application." };
  await updateCoverLetter(applicationId, text);
  revalidatePath(`/applications/${applicationId}/tailor`);
  return { ok: true, message: "Cover letter saved." };
}

export async function setModeAction(formData: FormData): Promise<void> {
  const id = String(formData.get("applicationId") ?? "");
  const mode = String(formData.get("mode") ?? "manual") as ApplicationMode;
  if (id) await setApplicationMode(id, mode);
  revalidatePath(`/applications/${id}/tailor`);
  revalidatePath(`/applications/${id}/submit`);
}

export async function approvePacketAction(formData: FormData): Promise<void> {
  const id = String(formData.get("applicationId") ?? "");
  if (!id) return;
  await approvePacket(id);
  revalidatePath(`/applications/${id}/tailor`);
  revalidatePath("/review");
  redirect(`/applications/${id}/submit`);
}

export async function submitApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("applicationId") ?? "");
  const confirmed = formData.get("confirmedAccurate") === "on";
  if (!id) return { ok: false, error: "Missing application." };
  try {
    const result = await submitApplication(id, confirmed);
    revalidatePath(`/applications/${id}/submit`);
    revalidatePath("/tracker");
    revalidatePath("/");
    return {
      ok: result.ok,
      message: [result.message, result.warning].filter(Boolean).join(" "),
      error: result.ok ? undefined : result.message,
    };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function setStatusAction(formData: FormData): Promise<void> {
  const parsed = statusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await setApplicationStatus(parsed.data.applicationId, parsed.data.status as ApplicationStatus);
  revalidatePath("/tracker");
  revalidatePath("/");
}

export async function updateApplicationFieldsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get("applicationId") ?? "");
  if (!id) return { ok: false, error: "Missing application." };
  await updateApplicationFields(id, {
    notes: String(formData.get("notes") ?? "") || undefined,
    referralContact: String(formData.get("referralContact") ?? "") || undefined,
    recruiterContact: String(formData.get("recruiterContact") ?? "") || undefined,
    outcome: String(formData.get("outcome") ?? "") || undefined,
    followUpDate: (formData.get("followUpDate") as string) || null,
  });
  revalidatePath("/tracker");
  return { ok: true, message: "Saved." };
}

export async function addFollowUpAction(formData: FormData): Promise<void> {
  const applicationId = String(formData.get("applicationId") ?? "");
  const title = String(formData.get("title") ?? "");
  const dueDate = String(formData.get("dueDate") ?? "");
  if (applicationId && title) await createFollowUp(applicationId, title, dueDate || undefined);
  revalidatePath("/tracker");
  revalidatePath("/");
}

export async function toggleFollowUpAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const completed = formData.get("completed") === "true";
  if (id) await toggleFollowUp(id, completed);
  revalidatePath("/tracker");
  revalidatePath("/");
}

export async function deleteApplicationAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await deleteApplication(id);
  revalidatePath("/tracker");
  redirect("/tracker");
}
