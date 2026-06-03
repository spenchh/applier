import { prisma } from "../db";
import { writeJson } from "../json";
import { ensureDatabaseReady } from "../runtime-db";
import { parseDate } from "./shared";

export async function getPrimaryProfile(userAccountId: string) {
  await ensureDatabaseReady();
  return prisma.userProfile.findFirst({
    where: { userAccountId },
    include: {
      facts: {
        orderBy: { createdAt: "desc" },
      },
      resumes: {
        orderBy: { updatedAt: "desc" },
      },
    },
  });
}

export async function ensureProfile(userAccountId: string, user?: { email: string; displayName: string | null }) {
  await ensureDatabaseReady();
  const existing = await getPrimaryProfile(userAccountId);
  if (existing) return existing;
  return prisma.userProfile.create({
    data: {
      userAccountId,
      legalName: user?.displayName || "New Student",
      preferredName: user?.displayName || "Student",
      email: user?.email || "student@example.com",
      school: "Add your school",
      major: "Add your major",
    },
    include: {
      facts: true,
      resumes: true,
    },
  });
}

export async function upsertProfile(input: {
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
}, userAccountId: string) {
  await ensureDatabaseReady();
  const existing = await prisma.userProfile.findFirst({ where: { userAccountId } });
  const data = {
    userAccountId,
    legalName: input.legalName,
    preferredName: input.preferredName || null,
    email: input.email,
    phone: input.phone || null,
    location: input.location || null,
    school: input.school || null,
    degree: input.degree || null,
    major: input.major || null,
    minor: input.minor || null,
    graduationDate: parseDate(input.graduationDate),
    gpa: input.gpa || null,
    workAuthorization: input.workAuthorization || null,
    sponsorshipRequired: Boolean(input.sponsorshipRequired),
    earliestStartDate: parseDate(input.earliestStartDate),
    preferredTerms: writeJson(input.preferredTerms ?? []),
    preferredLocations: writeJson(input.preferredLocations ?? []),
    remotePreference: input.remotePreference || null,
    portfolioUrl: input.portfolioUrl || null,
    githubUrl: input.githubUrl || null,
    linkedinUrl: input.linkedinUrl || null,
    websiteUrl: input.websiteUrl || null,
  };

  const profile = existing
    ? await prisma.userProfile.update({ where: { id: existing.id }, data })
    : await prisma.userProfile.create({ data });

  await prisma.auditLog.create({
    data: {
      entityType: "UserProfile",
      entityId: profile.id,
      action: "profile.upsert",
      metadataJson: "{}",
    },
  });

  return profile;
}

export async function createProfileFact(input: {
  userProfileId: string;
  type: string;
  title: string;
  organization?: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  description: string;
  impact?: string;
  skills?: string[];
  evidenceNote?: string;
  resumeAllowed?: boolean;
  coverLetterAllowed?: boolean;
  answersAllowed?: boolean;
  verified?: boolean;
}) {
  await ensureDatabaseReady();
  const fact = await prisma.profileFact.create({
    data: {
      userProfileId: input.userProfileId,
      type: input.type,
      title: input.title,
      organization: input.organization || null,
      location: input.location || null,
      startDate: parseDate(input.startDate),
      endDate: parseDate(input.endDate),
      description: input.description,
      impact: input.impact || null,
      skills: writeJson(input.skills ?? []),
      evidenceNote: input.evidenceNote || null,
      resumeAllowed: input.resumeAllowed ?? true,
      coverLetterAllowed: input.coverLetterAllowed ?? true,
      answersAllowed: input.answersAllowed ?? true,
      verified: input.verified ?? false,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "ProfileFact",
      entityId: fact.id,
      action: "fact.create",
      metadataJson: writeJson({ title: fact.title, type: fact.type }),
    },
  });

  return fact;
}
