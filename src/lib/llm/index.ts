import { getProvider } from "./provider";
import { SYSTEM } from "./prompts";
import {
  resumeStructureSchema,
  parsedJobSchema,
  fitAnalysisSchema,
  tailoredResumeSchema,
  coverLetterSchema,
  generatedAnswersSchema,
  truthCheckSchema,
  type ResumeStructure,
  type ParsedJob,
  type FitAnalysis,
  type TailoredResume,
  type GeneratedCoverLetter,
  type GeneratedAnswers,
  type TruthCheckResult,
} from "./types";
import type { MockFact } from "./mock";

/**
 * The public LLM task API. Each function builds grounded context, calls the
 * configured provider (which falls back to mock when no key is set), and
 * returns a schema-validated result. The `context` passed here is also what the
 * mock provider uses to stay grounded in real facts.
 */

export type { MockFact } from "./mock";

export interface JobContext {
  company?: string;
  title?: string;
  technologies?: string[];
  keywords?: string[];
  requiredQualifications?: string[];
  preferredQualifications?: string[];
  responsibilities?: string[];
  recruiter?: string;
}

export interface ProfileContext {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  school?: string;
  major?: string;
  graduation?: string;
  gpa?: string;
  github?: string;
  portfolio?: string;
  linkedin?: string;
  workAuthorization?: string;
  sponsorshipRequired?: string;
  earliestStartDate?: string;
  preferredTerms?: string;
}

function provider(configured?: string) {
  return getProvider(configured);
}

export async function parseResume(rawText: string, configured?: string): Promise<ResumeStructure> {
  return provider(configured).generateStructuredObject(
    SYSTEM.parseResume,
    `Parse this resume into structured JSON:\n\n${rawText}`,
    resumeStructureSchema,
    { task: "parseResume", context: { rawText } },
  );
}

export async function parseJobPosting(
  rawText: string,
  sourceUrl = "",
  configured?: string,
): Promise<ParsedJob> {
  return provider(configured).generateStructuredObject(
    SYSTEM.parseJob,
    `Parse this internship posting (source: ${sourceUrl || "pasted text"}):\n\n${rawText}`,
    parsedJobSchema,
    { task: "parseJob", context: { rawText, sourceUrl } },
  );
}

export async function scoreFit(
  facts: MockFact[],
  job: JobContext,
  configured?: string,
): Promise<FitAnalysis> {
  return provider(configured).generateStructuredObject(
    SYSTEM.scoreFit,
    `Score the fit between these facts and the posting.\nFacts: ${summarizeFacts(facts)}\nJob: ${JSON.stringify(job)}`,
    fitAnalysisSchema,
    { task: "scoreFit", context: { facts, job } },
  );
}

export async function tailorResume(
  facts: MockFact[],
  job: JobContext,
  profile: ProfileContext,
  master: ResumeStructure | null,
  fit: FitAnalysis | null,
  configured?: string,
): Promise<TailoredResume> {
  return provider(configured).generateStructuredObject(
    SYSTEM.tailorResume,
    `Tailor a resume to this job using ONLY these facts.\nFacts: ${summarizeFacts(facts)}\nJob: ${JSON.stringify(job)}\nFit: ${JSON.stringify(fit ?? {})}`,
    tailoredResumeSchema,
    { task: "tailorResume", context: { facts, job, profile, master, fit } },
  );
}

export async function generateCoverLetter(
  facts: MockFact[],
  job: JobContext,
  profile: ProfileContext,
  fit: FitAnalysis | null,
  configured?: string,
): Promise<GeneratedCoverLetter> {
  return provider(configured).generateStructuredObject(
    SYSTEM.coverLetter,
    `Write a concise cover letter using ONLY these facts.\nFacts: ${summarizeFacts(facts)}\nJob: ${JSON.stringify(job)}`,
    coverLetterSchema,
    { task: "coverLetter", context: { facts, job, profile, fit } },
  );
}

export interface AnswerQuestionInput {
  questionText: string;
  questionType?: string;
  sensitive?: boolean;
}

export async function generateApplicationAnswers(
  questions: AnswerQuestionInput[],
  facts: MockFact[],
  profile: ProfileContext,
  job: JobContext,
  configured?: string,
): Promise<GeneratedAnswers> {
  return provider(configured).generateStructuredObject(
    SYSTEM.answers,
    `Answer these application questions using ONLY these facts.\nQuestions: ${JSON.stringify(questions)}\nFacts: ${summarizeFacts(facts)}`,
    generatedAnswersSchema,
    { task: "answers", context: { questions, facts, profile, job } },
  );
}

export async function truthCheck(
  claims: string[],
  facts: MockFact[],
  configured?: string,
): Promise<TruthCheckResult> {
  return provider(configured).generateStructuredObject(
    SYSTEM.truthCheck,
    `Verify these claims against the facts.\nClaims: ${JSON.stringify(claims)}\nFacts: ${summarizeFacts(facts)}`,
    truthCheckSchema,
    { task: "truthCheck", context: { claims, facts } },
  );
}

/** Compact fact summary for prompts (ids + key fields, never PII-heavy dumps). */
function summarizeFacts(facts: MockFact[]): string {
  return JSON.stringify(
    facts.map((f) => ({
      id: f.id,
      type: f.type,
      title: f.title,
      org: f.organization,
      skills: f.skills,
      impact: f.impact,
    })),
  );
}
