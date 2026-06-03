import type { Prisma } from "@prisma/client";
import { db } from "../db";
import { encrypt } from "../encryption";
import { toJson } from "../utils";
import { recordAudit } from "../audit";
import type { ProfileFactType } from "../constants";

/**
 * Single-user MVP: there is one UserProfile. `getOrCreateProfile` returns it,
 * creating an empty shell on first run so onboarding has something to edit.
 */
export async function getOrCreateProfile() {
  const existing = await db.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return db.userProfile.create({
    data: { legalName: "", email: "" },
  });
}

export async function getProfileWithFacts() {
  const profile = await getOrCreateProfile();
  const facts = await db.profileFact.findMany({
    where: { userProfileId: profile.id },
    orderBy: [{ type: "asc" }, { createdAt: "desc" }],
  });
  return { profile, facts };
}

export interface ProfileInput {
  legalName: string;
  preferredName?: string;
  email: string;
  phone?: string;
  location?: string;
  school?: string;
  degree?: string;
  major?: string;
  minor?: string;
  graduationDate?: string;
  gpa?: string;
  workAuthorization?: string;
  sponsorshipRequired?: boolean;
  earliestStartDate?: string;
  preferredTerms?: string[];
  preferredLocations?: string[];
  remotePreference?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
}

function toDate(value?: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function upsertProfile(input: ProfileInput) {
  const profile = await getOrCreateProfile();
  const data: Prisma.UserProfileUpdateInput = {
    legalName: input.legalName,
    preferredName: input.preferredName || null,
    email: input.email,
    // Encrypt sensitive free-text fields at rest.
    phone: encrypt(input.phone) ?? null,
    location: input.location || null,
    school: input.school || null,
    degree: input.degree || null,
    major: input.major || null,
    minor: input.minor || null,
    graduationDate: toDate(input.graduationDate),
    gpa: input.gpa || null,
    workAuthorization: encrypt(input.workAuthorization) ?? null,
    sponsorshipRequired: Boolean(input.sponsorshipRequired),
    earliestStartDate: toDate(input.earliestStartDate),
    preferredTerms: input.preferredTerms ? toJson(input.preferredTerms) : null,
    preferredLocations: input.preferredLocations ? toJson(input.preferredLocations) : null,
    remotePreference: input.remotePreference || null,
    portfolioUrl: input.portfolioUrl || null,
    githubUrl: input.githubUrl || null,
    linkedinUrl: input.linkedinUrl || null,
    websiteUrl: input.websiteUrl || null,
  };
  const updated = await db.userProfile.update({ where: { id: profile.id }, data });
  await recordAudit("UserProfile", profile.id, "update.profile", { fields: Object.keys(data).length });
  return updated;
}

export interface FactInput {
  type: ProfileFactType;
  title: string;
  organization?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  impact?: string;
  skills?: string[];
  evidenceNote?: string;
  resumeAllowed?: boolean;
  coverLetterAllowed?: boolean;
  answersAllowed?: boolean;
  verified?: boolean;
}

export async function createFact(input: FactInput) {
  const profile = await getOrCreateProfile();
  const fact = await db.profileFact.create({
    data: {
      userProfileId: profile.id,
      type: input.type,
      title: input.title,
      organization: input.organization || null,
      location: input.location || null,
      startDate: toDate(input.startDate),
      endDate: toDate(input.endDate),
      description: input.description || null,
      impact: input.impact || null,
      skills: input.skills ? toJson(input.skills) : null,
      evidenceNote: input.evidenceNote || null,
      resumeAllowed: input.resumeAllowed ?? true,
      coverLetterAllowed: input.coverLetterAllowed ?? true,
      answersAllowed: input.answersAllowed ?? true,
      verified: input.verified ?? false,
    },
  });
  await recordAudit("ProfileFact", fact.id, "create.fact", { type: fact.type });
  return fact;
}

export async function updateFact(id: string, input: FactInput) {
  const fact = await db.profileFact.update({
    where: { id },
    data: {
      type: input.type,
      title: input.title,
      organization: input.organization || null,
      location: input.location || null,
      startDate: toDate(input.startDate),
      endDate: toDate(input.endDate),
      description: input.description || null,
      impact: input.impact || null,
      skills: input.skills ? toJson(input.skills) : null,
      evidenceNote: input.evidenceNote || null,
      resumeAllowed: input.resumeAllowed ?? true,
      coverLetterAllowed: input.coverLetterAllowed ?? true,
      answersAllowed: input.answersAllowed ?? true,
      verified: input.verified ?? false,
    },
  });
  await recordAudit("ProfileFact", id, "update.fact", { type: fact.type });
  return fact;
}

export async function deleteFact(id: string) {
  await db.profileFact.delete({ where: { id } });
  await recordAudit("ProfileFact", id, "delete.fact", {});
}
