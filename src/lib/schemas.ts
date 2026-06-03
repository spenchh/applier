import { z } from "zod";

export const profileSchema = z.object({
  legalName: z.string().min(1, "Legal name is required"),
  preferredName: z.string().optional(),
  email: z.string().email("Use a valid email"),
  phone: z.string().optional(),
  location: z.string().optional(),
  school: z.string().optional(),
  degree: z.string().optional(),
  major: z.string().optional(),
  minor: z.string().optional(),
  graduationDate: z.string().optional(),
  gpa: z.string().optional(),
  workAuthorization: z.string().optional(),
  sponsorshipRequired: z.boolean().default(false),
  earliestStartDate: z.string().optional(),
  preferredTerms: z.array(z.string()).default([]),
  preferredLocations: z.array(z.string()).default([]),
  remotePreference: z.string().optional(),
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

export const jobInputSchema = z.object({
  sourceUrl: z.string().url().optional().or(z.literal("")),
  sourceName: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  roleCategory: z.string().optional(),
  location: z.string().optional(),
  rawDescription: z.string().min(20),
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
