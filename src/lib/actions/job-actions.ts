"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { jobUrlSchema, jobTextSchema, jobManualSchema, csvSchema } from "../validation/schemas";
import {
  importJobFromUrl,
  createJobFromText,
  createJobManual,
  importJobsFromCsv,
} from "../services/job-service";
import { db } from "../db";
import type { ActionState } from "./profile-actions";

export type { ActionState } from "./profile-actions";

export async function importJobUrlAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = jobUrlSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid URL" };

  const result = await importJobFromUrl(parsed.data.url, parsed.data.sourceName);
  revalidatePath("/jobs");

  if (result.status === "imported" && result.jobId) {
    redirect(`/jobs/${result.jobId}`);
  }
  if (result.status === "duplicate" && result.jobId) {
    redirect(`/jobs/${result.jobId}`);
  }
  // restricted or needs-paste — keep the user on the page with guidance + URL prefilled.
  return {
    ok: false,
    message: result.note,
    error: result.status === "restricted" ? "RESTRICTED" : "NEEDS_PASTE",
  };
}

export async function createJobTextAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = jobTextSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const result = await createJobFromText(parsed.data.rawText, {
    sourceUrl: parsed.data.sourceUrl || undefined,
    sourceName: parsed.data.sourceName || "pasted",
  });
  revalidatePath("/jobs");
  redirect(`/jobs/${result.duplicateOfId ?? result.id}`);
}

export async function createJobManualAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = jobManualSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const result = await createJobManual(parsed.data);
  revalidatePath("/jobs");
  redirect(`/jobs/${result.duplicateOfId ?? result.id}`);
}

export async function importCsvAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = csvSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid CSV" };
  const result = await importJobsFromCsv(parsed.data.csv);
  revalidatePath("/jobs");
  return {
    ok: true,
    message: `Imported ${result.created} job(s)${result.duplicates ? `, skipped ${result.duplicates} duplicate(s)` : ""}.${
      result.errors.length ? ` ${result.errors.length} row(s) had issues.` : ""
    }`,
  };
}

export async function deleteJobAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) await db.jobPosting.delete({ where: { id } });
  revalidatePath("/jobs");
  redirect("/jobs");
}
