import type { ProfileFact, UserProfile } from "@prisma/client";
import { parseStringList } from "../utils";
import { decrypt } from "../encryption";
import type { MockFact } from "../llm/mock";
import type { ProfileContext } from "../llm";

/** Map a stored ProfileFact row into the grounded fact shape the LLM uses. */
export function toMockFact(fact: ProfileFact): MockFact {
  return {
    id: fact.id,
    type: fact.type,
    title: fact.title,
    organization: fact.organization,
    location: fact.location,
    description: fact.description,
    impact: fact.impact,
    skills: parseStringList(fact.skills),
    resumeAllowed: fact.resumeAllowed,
    coverLetterAllowed: fact.coverLetterAllowed,
    answersAllowed: fact.answersAllowed,
  };
}

export function toMockFacts(facts: ProfileFact[]): MockFact[] {
  return facts.map(toMockFact);
}

/** Build the (decrypted) profile context the generators use. */
export function toProfileContext(profile: UserProfile): ProfileContext {
  return {
    name: profile.preferredName || profile.legalName,
    email: profile.email,
    phone: decrypt(profile.phone) ?? undefined,
    location: profile.location ?? undefined,
    school: profile.school ?? undefined,
    major: profile.major ?? undefined,
    graduation: profile.graduationDate ? profile.graduationDate.toISOString().slice(0, 10) : undefined,
    gpa: profile.gpa ?? undefined,
    github: profile.githubUrl ?? undefined,
    portfolio: profile.portfolioUrl ?? undefined,
    linkedin: profile.linkedinUrl ?? undefined,
    workAuthorization: decrypt(profile.workAuthorization) ?? undefined,
    sponsorshipRequired: String(profile.sponsorshipRequired),
    earliestStartDate: profile.earliestStartDate
      ? profile.earliestStartDate.toISOString().slice(0, 10)
      : undefined,
    preferredTerms: parseStringList(profile.preferredTerms).join(", ") || undefined,
  };
}
