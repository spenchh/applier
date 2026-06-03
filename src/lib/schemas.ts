import { z } from "zod";

export const profileSchema = z.object({
  legalName: z.string().min(1, "Legal name is required"),
  preferredName: z.string().min(1, "Preferred name is required"),
  email: z.string().email("Use a valid email"),
  phone: z.string().min(10, "Phone is required"),
  location: z.string().min(1, "Location is required"),
  school: z.string().min(1, "School is required"),
  degree: z.string().min(1, "Degree is required"),
  major: z.string().min(1, "Major is required"),
  minor: z.string().optional(),
  graduationDate: z.string().min(1, "Graduation date is required"),
  gpa: z.string().min(1, "GPA is required"),
  workAuthorization: z.string().min(1, "Work authorization is required"),
  careerInterests: z.string().min(8, "Add a few interests so AI can explore internship lanes"),
  sponsorshipRequired: z.boolean().default(false),
  earliestStartDate: z.string().min(1, "Earliest start date is required"),
  preferredTerms: z.array(z.string()).min(1, "Preferred terms are required"),
  preferredLocations: z.array(z.string()).min(1, "Preferred locations are required"),
  remotePreference: z.string().min(1, "Remote preference is required"),
  portfolioUrl: z.string().url().optional().or(z.literal("")),
  githubUrl: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  websiteUrl: z.string().url().optional().or(z.literal("")),
});

export const profileFactSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  organization: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().min(10),
  impact: z.string().optional(),
  skills: z.array(z.string()).default([]),
  evidenceNote: z.string().optional(),
  resumeAllowed: z.boolean().default(true),
  coverLetterAllowed: z.boolean().default(true),
  answersAllowed: z.boolean().default(true),
  verified: z.boolean().default(false),
});

export const resumeSchema = z.object({
  name: z.string().min(1),
  baseType: z.string().min(1),
  rawText: z.string().min(20),
  isMaster: z.boolean().default(false),
});

export const resumeUploadSchema = z.object({
  name: z.string().min(1),
  baseType: z.string().min(1),
  isMaster: z.boolean().default(true),
  filename: z.string().min(1),
  mimeType: z.enum(["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
  size: z.number().positive().max(5 * 1024 * 1024, "Resume uploads must be 5 MB or smaller."),
});

export const resumeStructureSchema = z.object({
  nameLine: z.string().optional(),
  contactLine: z.string().optional(),
  sections: z.array(
    z.object({
      heading: z.string(),
      items: z.array(z.string()),
    }),
  ),
  skills: z.array(z.string()).default([]),
});

export type ResumeStructure = z.infer<typeof resumeStructureSchema>;

export const jobInputSchema = z.object({
  sourceUrl: z.string().url().optional().or(z.literal("")),
  sourceName: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  roleCategory: z.string().optional(),
  location: z.string().optional(),
  rawDescription: z.string().min(20),
});

export const discoveryQuerySchema = z.object({
  keyword: z.string().optional(),
  location: z.string().optional(),
  workplaceType: z.string().optional(),
  internshipTerm: z.string().optional(),
  postedWithinDays: z.number().positive().optional(),
  company: z.string().optional(),
  minCompensation: z.number().positive().optional(),
  maxCompensation: z.number().positive().optional(),
  visaSponsorshipFriendly: z.boolean().optional(),
  workAuthNotRequired: z.boolean().optional(),
  deadlineWithinDays: z.number().positive().optional(),
  source: z.string().optional(),
});

export const parsedJobSchema = z.object({
  company: z.string(),
  title: z.string(),
  roleCategory: z.string().default("general_internship"),
  location: z.string().optional(),
  workplaceType: z.string().optional(),
  internshipTerm: z.string().optional(),
  responsibilities: z.array(z.string()),
  requiredQualifications: z.array(z.string()),
  preferredQualifications: z.array(z.string()),
  technologies: z.array(z.string()),
  keywords: z.array(z.string()),
  applicationQuestions: z.array(
    z.object({
      questionText: z.string(),
      questionType: z.string().default("text"),
      required: z.boolean().default(false),
      sensitive: z.boolean().default(false),
    }),
  ),
  riskFlags: z.array(z.string()),
});

export type ParsedJob = z.infer<typeof parsedJobSchema>;

export type FitAnalysis = {
  fitScore: number;
  matchedRequirements: string[];
  partiallyMatchedRequirements: string[];
  missingRequirements: string[];
  strongestEvidence: { requirement: string; factId: string; factTitle: string }[];
  risks: string[];
  recommendedResumeTemplate: string;
  suggestedPositioning: string;
};

export type TruthCheck = {
  supportedClaims: string[];
  weakClaims: string[];
  unsupportedClaims: string[];
  recommendedEdits: string[];
};

export type KeywordCoverage = {
  requiredPresent: string[];
  preferredPresent: string[];
  missingKeywords: string[];
  intentionallyOmitted: string[];
};
