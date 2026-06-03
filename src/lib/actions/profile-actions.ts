"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { profileSchema, factSchema, splitList } from "../validation/schemas";
import { upsertProfile, createFact, updateFact, deleteFact } from "../services/profile-service";
import type { ProfileFactType } from "../constants";

export interface ActionState {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  message?: string;
}

function fieldErrorsFrom(error: { issues: { path: (string | number)[]; message: string }[] }) {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function saveProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = profileSchema.safeParse({ ...raw, sponsorshipRequired: raw.sponsorshipRequired === "on" });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const v = parsed.data;
  await upsertProfile({
    ...v,
    preferredTerms: splitList(v.preferredTerms),
    preferredLocations: splitList(v.preferredLocations),
    remotePreference: v.remotePreference || undefined,
  });
  revalidatePath("/profile");
  revalidatePath("/");
  if (raw.__redirect) redirect(raw.__redirect);
  return { ok: true, message: "Profile saved." };
}

export async function saveFactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = factSchema.safeParse({
    ...raw,
    resumeAllowed: raw.resumeAllowed === "on",
    coverLetterAllowed: raw.coverLetterAllowed === "on",
    answersAllowed: raw.answersAllowed === "on",
    verified: raw.verified === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const v = parsed.data;
  const input = {
    type: v.type as ProfileFactType,
    title: v.title,
    organization: v.organization,
    location: v.location,
    startDate: v.startDate,
    endDate: v.endDate,
    description: v.description,
    impact: v.impact,
    skills: splitList(v.skills),
    evidenceNote: v.evidenceNote,
    resumeAllowed: v.resumeAllowed,
    coverLetterAllowed: v.coverLetterAllowed,
    answersAllowed: v.answersAllowed,
    verified: v.verified,
  };
  if (v.id) await updateFact(v.id, input);
  else await createFact(input);
  revalidatePath("/profile");
  return { ok: true, message: v.id ? "Fact updated." : "Fact added to your Truth Vault." };
}

export async function deleteFactAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await deleteFact(id);
  revalidatePath("/profile");
}
