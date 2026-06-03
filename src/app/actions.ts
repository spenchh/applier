"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { formBool, formString, fromCsv } from "@/lib/json";
import { jobInputSchema, profileFactSchema, profileSchema, resumeSchema } from "@/lib/schemas";
import { approveApplication, markSubmitted, updateApplicationStatus } from "@/lib/services/application";
import { createJobFromInput } from "@/lib/services/job";
import { createProfileFact, ensureProfile, upsertProfile } from "@/lib/services/profile";
import { createResume } from "@/lib/services/resume";
import { updateSettings } from "@/lib/services/settings";
import { generateApplicationPacket } from "@/lib/services/tailoring";

export async function saveProfileAction(formData: FormData) {
  const parsed = profileSchema.parse({
    legalName: formString(formData, "legalName"),
    preferredName: formString(formData, "preferredName"),
    email: formString(formData, "email"),
    phone: formString(formData, "phone"),
    location: formString(formData, "location"),
    school: formString(formData, "school"),
    degree: formString(formData, "degree"),
    major: formString(formData, "major"),
    minor: formString(formData, "minor"),
    graduationDate: formString(formData, "graduationDate"),
    gpa: formString(formData, "gpa"),
    workAuthorization: formString(formData, "workAuthorization"),
    sponsorshipRequired: formBool(formData, "sponsorshipRequired"),
    earliestStartDate: formString(formData, "earliestStartDate"),
    preferredTerms: fromCsv(formData.get("preferredTerms")),
    preferredLocations: fromCsv(formData.get("preferredLocations")),
    remotePreference: formString(formData, "remotePreference"),
    portfolioUrl: formString(formData, "portfolioUrl"),
    githubUrl: formString(formData, "githubUrl"),
    linkedinUrl: formString(formData, "linkedinUrl"),
    websiteUrl: formString(formData, "websiteUrl"),
  });
  await upsertProfile(parsed);
  revalidatePath("/");
  revalidatePath("/profile");
  redirect("/profile");
}

export async function createFactAction(formData: FormData) {
  const profile = await ensureProfile();
  const parsed = profileFactSchema.parse({
    type: formString(formData, "type"),
    title: formString(formData, "title"),
    organization: formString(formData, "organization"),
    location: formString(formData, "location"),
    startDate: formString(formData, "startDate"),
    endDate: formString(formData, "endDate"),
    description: formString(formData, "description"),
    impact: formString(formData, "impact"),
    skills: fromCsv(formData.get("skills")),
    evidenceNote: formString(formData, "evidenceNote"),
    resumeAllowed: formBool(formData, "resumeAllowed"),
    coverLetterAllowed: formBool(formData, "coverLetterAllowed"),
    answersAllowed: formBool(formData, "answersAllowed"),
    verified: formBool(formData, "verified"),
  });
  await createProfileFact({ userProfileId: profile.id, ...parsed });
  revalidatePath("/profile");
}

export async function createResumeAction(formData: FormData) {
  const profile = await ensureProfile();
  const parsed = resumeSchema.parse({
    name: formString(formData, "name"),
    baseType: formString(formData, "baseType"),
    rawText: formString(formData, "rawText"),
    isMaster: formBool(formData, "isMaster"),
  });
  await createResume({ userProfileId: profile.id, ...parsed });
  revalidatePath("/resumes");
}

export async function createJobAction(formData: FormData) {
  const parsed = jobInputSchema.parse({
    sourceUrl: formString(formData, "sourceUrl"),
    sourceName: formString(formData, "sourceName"),
    company: formString(formData, "company"),
    title: formString(formData, "title"),
    location: formString(formData, "location"),
    rawDescription: formString(formData, "rawDescription"),
  });
  const job = await createJobFromInput(parsed);
  revalidatePath("/jobs");
  redirect(`/jobs/${job.id}`);
}

export async function generatePacketAction(formData: FormData) {
  const profile = await ensureProfile();
  const jobId = formString(formData, "jobId");
  const application = await generateApplicationPacket(jobId, profile.id);
  revalidatePath("/applications/review");
  redirect(`/applications/${application.id}/tailor`);
}

export async function approveApplicationAction(formData: FormData) {
  const applicationId = formString(formData, "applicationId");
  await approveApplication(applicationId);
  revalidatePath(`/applications/${applicationId}/tailor`);
  redirect(`/applications/${applicationId}/submit`);
}

export async function markSubmittedAction(formData: FormData) {
  const applicationId = formString(formData, "applicationId");
  await markSubmitted(applicationId);
  revalidatePath("/tracker");
  redirect("/tracker");
}

export async function updateStatusAction(applicationId: string, status: string) {
  await updateApplicationStatus(applicationId, status);
  revalidatePath("/tracker");
  revalidatePath("/applications/review");
}

export async function updateSettingsAction(formData: FormData) {
  await updateSettings({
    llmProvider: formString(formData, "llmProvider") || "mock",
    defaultResumeTemplate: formString(formData, "defaultResumeTemplate") || "software_engineering",
    disableSubmissionAdapters: formBool(formData, "disableSubmissionAdapters"),
    maxApplicationsPerDay: Number(formString(formData, "maxApplicationsPerDay") || 10),
  });
  revalidatePath("/settings");
}

export async function deleteAllDataAction(_formData: FormData) {
  void _formData;
  await prisma.auditLog.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.company.deleteMany();
  await prisma.appSettings.upsert({
    where: { id: "singleton" },
    update: { requireReview: true, llmProvider: "mock", disableSubmissionAdapters: false },
    create: { id: "singleton", requireReview: true, llmProvider: "mock", disableSubmissionAdapters: false },
  });
  revalidatePath("/");
  redirect("/");
}
