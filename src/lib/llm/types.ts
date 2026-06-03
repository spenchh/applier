import { z } from "zod";

/**
 * Zod schemas for all structured LLM outputs. These double as runtime
 * validators for provider responses (the provider abstraction validates every
 * structured object against the supplied schema before returning it).
 */

// ---- Resume parsing -------------------------------------------------------

export const resumeBulletSchema = z.object({
  text: z.string(),
});

export const resumeExperienceSchema = z.object({
  title: z.string().default(""),
  organization: z.string().default(""),
  location: z.string().default(""),
  startDate: z.string().default(""),
  endDate: z.string().default(""),
  bullets: z.array(z.string()).default([]),
});

export const resumeStructureSchema = z.object({
  header: z
    .object({
      name: z.string().default(""),
      email: z.string().default(""),
      phone: z.string().default(""),
      location: z.string().default(""),
      links: z.array(z.string()).default([]),
    })
    .default({ name: "", email: "", phone: "", location: "", links: [] }),
  summary: z.string().default(""),
  education: z
    .array(
      z.object({
        school: z.string().default(""),
        degree: z.string().default(""),
        field: z.string().default(""),
        graduation: z.string().default(""),
        gpa: z.string().default(""),
        details: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  experience: z.array(resumeExperienceSchema).default([]),
  projects: z
    .array(
      z.object({
        name: z.string().default(""),
        description: z.string().default(""),
        technologies: z.array(z.string()).default([]),
        bullets: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  skills: z.array(z.string()).default([]),
  awards: z.array(z.string()).default([]),
});
export type ResumeStructure = z.infer<typeof resumeStructureSchema>;

// ---- Job parsing ----------------------------------------------------------

export const riskFlagSchema = z.object({
  code: z.string(),
  label: z.string(),
  severity: z.enum(["low", "medium", "high"]).default("low"),
  detail: z.string().default(""),
});
export type RiskFlag = z.infer<typeof riskFlagSchema>;

export const jobQuestionSchema = z.object({
  questionText: z.string(),
  questionType: z
    .enum([
      "text",
      "textarea",
      "select",
      "multiselect",
      "boolean",
      "file",
      "eligibility",
      "demographic",
    ])
    .default("textarea"),
  required: z.boolean().default(false),
  options: z.array(z.string()).default([]),
  sensitive: z.boolean().default(false),
});
export type ParsedJobQuestion = z.infer<typeof jobQuestionSchema>;

export const parsedJobSchema = z.object({
  company: z.string().default(""),
  companyWebsite: z.string().default(""),
  title: z.string().default(""),
  location: z.string().default(""),
  workplaceType: z.enum(["remote", "hybrid", "onsite", ""]).default(""),
  internshipTerm: z.string().default(""),
  deadline: z.string().default(""),
  applicationEmail: z.string().default(""),
  compensation: z.string().default(""),
  responsibilities: z.array(z.string()).default([]),
  requiredQualifications: z.array(z.string()).default([]),
  preferredQualifications: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  questions: z.array(jobQuestionSchema).default([]),
  riskFlags: z.array(riskFlagSchema).default([]),
  missingFields: z.array(z.string()).default([]),
});
export type ParsedJob = z.infer<typeof parsedJobSchema>;

// ---- Fit scoring ----------------------------------------------------------

export const fitAnalysisSchema = z.object({
  fitScore: z.number().min(0).max(100).default(0),
  summary: z.string().default(""),
  matched: z.array(z.string()).default([]),
  partiallyMatched: z.array(z.string()).default([]),
  missing: z.array(z.string()).default([]),
  strongestEvidence: z.array(z.string()).default([]),
  risks: z.array(z.string()).default([]),
  recommendedTemplate: z.string().default("general"),
  suggestedPositioning: z.string().default(""),
});
export type FitAnalysis = z.infer<typeof fitAnalysisSchema>;

// ---- Claims / truth check -------------------------------------------------

export const claimSchema = z.object({
  text: z.string(),
  supportingFactIds: z.array(z.string()).default([]),
  status: z.enum(["supported", "weak", "unsupported"]).default("supported"),
  note: z.string().default(""),
});
export type Claim = z.infer<typeof claimSchema>;

export const truthCheckSchema = z.object({
  supported: z.array(claimSchema).default([]),
  weak: z.array(claimSchema).default([]),
  unsupported: z.array(claimSchema).default([]),
  missingFacts: z.array(z.string()).default([]),
  recommendedEdits: z.array(z.string()).default([]),
});
export type TruthCheckResult = z.infer<typeof truthCheckSchema>;

// ---- Keyword coverage -----------------------------------------------------

export const keywordCoverageSchema = z.object({
  requiredPresent: z.array(z.string()).default([]),
  preferredPresent: z.array(z.string()).default([]),
  missing: z.array(z.string()).default([]),
  intentionallyOmitted: z.array(z.string()).default([]),
});
export type KeywordCoverage = z.infer<typeof keywordCoverageSchema>;

// ---- Tailoring ------------------------------------------------------------

export const bulletChangeSchema = z.object({
  before: z.string().default(""),
  after: z.string().default(""),
  supportingFactIds: z.array(z.string()).default([]),
  rationale: z.string().default(""),
});

export const tailoredResumeSchema = z.object({
  structured: resumeStructureSchema,
  text: z.string().default(""),
  summary: z.string().default(""),
  reorderedSkills: z.array(z.string()).default([]),
  bulletChanges: z.array(bulletChangeSchema).default([]),
  supportingFactIds: z.array(z.string()).default([]),
  unsupportedClaims: z.array(z.string()).default([]),
  keywordCoverage: keywordCoverageSchema,
});
export type TailoredResume = z.infer<typeof tailoredResumeSchema>;

// ---- Cover letter ---------------------------------------------------------

export const coverLetterSchema = z.object({
  text: z.string().default(""),
  supportingFactIds: z.array(z.string()).default([]),
  unsupportedClaims: z.array(z.string()).default([]),
});
export type GeneratedCoverLetter = z.infer<typeof coverLetterSchema>;

// ---- Application answers ---------------------------------------------------

export const generatedAnswerSchema = z.object({
  questionText: z.string(),
  answerText: z.string().default(""),
  supportingFactIds: z.array(z.string()).default([]),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
  sensitive: z.boolean().default(false),
  needsUserInput: z.boolean().default(false),
  note: z.string().default(""),
});
export type GeneratedAnswer = z.infer<typeof generatedAnswerSchema>;

export const generatedAnswersSchema = z.object({
  answers: z.array(generatedAnswerSchema).default([]),
});
export type GeneratedAnswers = z.infer<typeof generatedAnswersSchema>;
