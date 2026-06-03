"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { resumeSchema } from "../validation/schemas";
import { createResume, deleteResume } from "../services/resume-service";
import type { ResumeBaseType } from "../constants";
import type { ActionState } from "./profile-actions";

export type { ActionState } from "./profile-actions";

export async function createResumeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  const parsed = resumeSchema.safeParse({ ...raw, isMaster: raw.isMaster === "on" });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await createResume({
    name: parsed.data.name,
    baseType: parsed.data.baseType as ResumeBaseType,
    rawText: parsed.data.rawText,
    isMaster: parsed.data.isMaster,
  });
  revalidatePath("/resumes");
  return { ok: true, message: "Resume saved and parsed into sections." };
}

export async function deleteResumeAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await deleteResume(id);
  revalidatePath("/resumes");
  redirect("/resumes");
}
