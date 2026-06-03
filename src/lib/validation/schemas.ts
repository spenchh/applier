import { z } from "zod";
import {
  PROFILE_FACT_TYPES,
  RESUME_BASE_TYPES,
  APPLICATION_STATUSES,
  WORKPLACE_TYPES,
} from "../constants";

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), { message: "Must be a valid http(s) URL" })
  .optional()
  .or(z.literal(""));

export const profileSchema = z.object({
  legalName: z.string().trim().min(1, "Legal name is required").max(120),
  preferredName: z.string().trim().max(120).optional(),
  email: z.string().trim().email("Valid email required").max(160),
  phone: z.string().trim().max(40).optional(),
  location: z.string().trim().max(160).optional(),
  school: z.string().trim().max(160).optional(),
  degree: z.string().trim().max(120).optional(),
  major: z.string().trim().max(120).optional(),
  minor: z.string().trim().max(120).optional(),
  graduationDate: z.string().trim().max(40).optional(),
  gpa: z.string().trim().max(20).optional(),
  workAuthorization: z.string().trim().max(200).optional(),
  sponsorshipRequired: z.coerce.boolean().optional(),
  earliestStartDate: z.string().trim().max(40).optional(),
  preferredTerms: z.string().trim().max(300).optional(), // comma-separated
  preferredLocations: z.string().trim().max(300).optional(), // comma-separated
  remotePreference: z.enum(["remote", "hybrid", "onsite", "any", ""]).optional(),
  portfolioUrl: optionalUrl,
  githubUrl: optionalUrl,
  linkedinUrl: optionalUrl,
  websiteUrl: optionalUrl,
});
export type ProfileFormValues = z.infer<typeof profileSchema>;

export const factSchema = z.object({
  id: z.string().optional(),
  type: z.enum(PROFILE_FACT_TYPES),
  title: z.string().trim().min(1, "Title is required").max(200),
  organization: z.string().trim().max(200).optional(),
  location: z.string().trim().max(160).optional(),
  startDate: z.string().trim().max(40).optional(),
  endDate: z.string().trim().max(40).optional(),
  description: z.string().trim().max(2000).optional(),
  impact: z.string().trim().max(600).optional(),
  skills: z.string().trim().max(600).optional(), // comma-separated
  evidenceNote: z.string().trim().max(600).optional(),
  resumeAllowed: z.coerce.boolean().optional(),
  coverLetterAllowed: z.coerce.boolean().optional(),
  answersAllowed: z.coerce.boolean().optional(),
  verified: z.coerce.boolean().optional(),
});
export type FactFormValues = z.infer<typeof factSchema>;

export const resumeSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(160),
  baseType: z.enum(RESUME_BASE_TYPES),
  rawText: z.string().trim().max(20000).optional(),
  isMaster: z.coerce.boolean().optional(),
});

export const jobUrlSchema = z.object({
  url: z.string().trim().url("Enter a valid URL"),
  sourceName: z.string().trim().max(80).optional(),
});

export const jobTextSchema = z.object({
  rawText: z.string().trim().min(40, "Paste the full job description (at least a few sentences)"),
  sourceUrl: z.string().trim().optional(),
  sourceName: z.string().trim().max(80).optional(),
});

export const jobManualSchema = z.object({
  company: z.string().trim().min(1, "Company is required").max(160),
  title: z.string().trim().min(1, "Role title is required").max(200),
  location: z.string().trim().max(160).optional(),
  workplaceType: z.enum([...WORKPLACE_TYPES, ""]).optional(),
  internshipTerm: z.string().trim().max(80).optional(),
  sourceUrl: z.string().trim().max(500).optional(),
  deadline: z.string().trim().max(40).optional(),
  compensation: z.string().trim().max(120).optional(),
  description: z.string().trim().max(20000).optional(),
});

export const csvSchema = z.object({
  csv: z.string().trim().min(10, "Paste CSV content with a header row"),
});

export const statusSchema = z.object({
  applicationId: z.string().min(1),
  status: z.enum(APPLICATION_STATUSES),
});

export const settingsSchema = z.object({
  llmProvider: z.enum(["mock", "anthropic", "openai"]),
  defaultResumeTemplate: z.enum(RESUME_BASE_TYPES),
  submissionAdaptersDisabled: z.coerce.boolean().optional(),
  maxApplicationsPerDay: z.coerce.number().int().min(1).max(100),
});

/** Split a comma/newline separated string into a clean list. */
export function splitList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
