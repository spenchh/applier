"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, signIn, signOut, signUp } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { formBool, formString, fromCsv } from "@/lib/json";
import { ensureDatabaseReady } from "@/lib/runtime-db";
import { jobInputSchema, profileFactSchema, profileSchema, resumeSchema } from "@/lib/schemas";
import { approveApplication, markSubmitted, updateApplicationStatus } from "@/lib/services/application";
import { normalizeDiscoveryQuery, saveDiscoverySearch, saveSourcedJobToInbox } from "@/lib/services/discovery";
import { createJobFromInput } from "@/lib/services/job";
import { createProfileFact, ensureProfile, upsertProfile } from "@/lib/services/profile";
import { createResume } from "@/lib/services/resume";
import { updateSettings } from "@/lib/services/settings";
import { generateApplicationPacket } from "@/lib/services/tailoring";

export async function signUpAction(formData: FormData) {
  const email = formString(formData, "email");
  const password = formString(formData, "password");
  const displayName = formString(formData, "displayName");
  const next = formString(formData, "next") || "/";
  if (password.length < 8) throw new Error("Password must be at least 8 characters.");
  await signUp({ email, password, displayName });
  redirect(next);
}

export async function signInAction(formData: FormData) {
  const email = formString(formData, "email");
  const password = formString(formData, "password");
  const next = formString(formData, "next") || "/";
  await signIn({ email, password, remember: true });
  redirect(next);
}

export async function signOutAction() {
  await signOut();
  redirect("/sign-in");
}

export async function saveProfileAction(formData: FormData) {
  const user = await requireUser("/onboarding");
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
    careerInterests: formString(formData, "careerInterests"),
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
  await upsertProfile(parsed, user.id);
  revalidatePath("/");
  revalidatePath("/profile");
  redirect("/profile");
}

export async function createFactAction(formData: FormData) {
  const user = await requireUser("/profile");
  const profile = await ensureProfile(user.id, user);
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
  const user = await requireUser("/resumes");
  const profile = await ensureProfile(user.id, user);
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
  const user = await requireUser("/jobs");
  const parsed = jobInputSchema.parse({
    sourceUrl: formString(formData, "sourceUrl"),
    sourceName: formString(formData, "sourceName"),
    company: formString(formData, "company"),
    title: formString(formData, "title"),
    roleCategory: formString(formData, "roleCategory"),
    location: formString(formData, "location"),
    rawDescription: formString(formData, "rawDescription"),
  });
  const job = await createJobFromInput({ ...parsed, userAccountId: user.id });
  revalidatePath("/jobs");
  redirect(`/jobs/${job.id}`);
}

export async function saveSourcedJobAction(formData: FormData) {
  const user = await requireUser("/discover");
  const sourcedJobId = formString(formData, "sourcedJobId");
  const job = await saveSourcedJobToInbox(sourcedJobId, user.id);
  revalidatePath("/discover");
  revalidatePath("/jobs");
  redirect(`/jobs/${job.id}`);
}

export async function saveDiscoverySearchAction(formData: FormData) {
  const user = await requireUser("/discover");
  const query = normalizeDiscoveryQuery({
    keyword: formString(formData, "keyword"),
    location: formString(formData, "location"),
    workplaceType: formString(formData, "workplaceType"),
    internshipTerm: formString(formData, "internshipTerm"),
    postedWithinDays: formString(formData, "postedWithinDays"),
    company: formString(formData, "company"),
    minCompensation: formString(formData, "minCompensation"),
    maxCompensation: formString(formData, "maxCompensation"),
    visaSponsorshipFriendly: formBool(formData, "visaSponsorshipFriendly") ? "true" : "",
    workAuthNotRequired: formBool(formData, "workAuthNotRequired") ? "true" : "",
    deadlineWithinDays: formString(formData, "deadlineWithinDays"),
    source: formString(formData, "source"),
  });
  await saveDiscoverySearch(user.id, formString(formData, "searchName"), query, formString(formData, "alertCadence") || "none");
  revalidatePath("/discover");
}

export async function generatePacketAction(formData: FormData) {
  const user = await requireUser("/jobs");
  const profile = await ensureProfile(user.id, user);
  const jobId = formString(formData, "jobId");
  const application = await generateApplicationPacket(jobId, profile.id);
  revalidatePath("/applications/review");
  redirect(`/applications/${application.id}/tailor`);
}

export async function approveApplicationAction(formData: FormData) {
  const user = await requireUser("/applications/review");
  const applicationId = formString(formData, "applicationId");
  await approveApplication(applicationId, user.id);
  revalidatePath(`/applications/${applicationId}/tailor`);
  redirect(`/applications/${applicationId}/submit`);
}

export async function markSubmittedAction(formData: FormData) {
  const user = await requireUser("/tracker");
  const applicationId = formString(formData, "applicationId");
  await markSubmitted(applicationId, user.id);
  revalidatePath("/tracker");
  redirect("/tracker");
}

export async function updateStatusAction(applicationId: string, status: string) {
  const user = await requireUser("/tracker");
  await updateApplicationStatus(applicationId, status, user.id);
  revalidatePath("/tracker");
  revalidatePath("/applications/review");
}

export async function updateSettingsAction(formData: FormData) {
  await requireUser("/settings");
  await updateSettings({
    llmProvider: formString(formData, "llmProvider") || "mock",
    aiModel: formString(formData, "aiModel"),
    aiInstructions: formString(formData, "aiInstructions"),
    defaultResumeTemplate: formString(formData, "defaultResumeTemplate") || "software_engineering",
    targetRoleTypes: fromCsv(formData.get("targetRoleTypes")),
    targetIndustries: fromCsv(formData.get("targetIndustries")),
    excludedKeywords: fromCsv(formData.get("excludedKeywords")),
    disableSubmissionAdapters: formBool(formData, "disableSubmissionAdapters"),
    maxApplicationsPerDay: Number(formString(formData, "maxApplicationsPerDay") || 10),
  });
  revalidatePath("/settings");
}

export async function deleteAllDataAction(_formData: FormData) {
  void _formData;
  const user = await requireUser("/settings");
  await ensureDatabaseReady();
  await prisma.userProfile.deleteMany({ where: { userAccountId: user.id } });
  await prisma.jobPosting.deleteMany({ where: { userAccountId: user.id } });
  await prisma.auditLog.deleteMany({ where: { entityId: user.id } });
  revalidatePath("/");
  redirect("/");
}
