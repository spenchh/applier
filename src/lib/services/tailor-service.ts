import { db } from "../db";
import { toJson, parseJson } from "../utils";
import { recordAudit } from "../audit";
import {
  tailorResume,
  generateCoverLetter,
  generateApplicationAnswers,
  truthCheck,
  type AnswerQuestionInput,
} from "../llm";
import type { FitAnalysis, TailoredResume, GeneratedCoverLetter } from "../llm/types";
import type { TruthCheckStatus } from "../constants";
import { toMockFacts, toProfileContext } from "./facts";
import { buildJobContext, analyzeFit } from "./fit-service";
import { getMasterResume, getResumeStructure } from "./resume-service";
import { renderResumeHtml, renderResumeText } from "./resume-render";
import { getSettings } from "./settings-service";

/** Questions every packet drafts even if the posting didn't list them. */
const STANDARD_QUESTIONS: AnswerQuestionInput[] = [
  { questionText: "Tell us about yourself.", questionType: "textarea" },
  { questionText: "Why are you interested in this role?", questionType: "textarea" },
  { questionText: "Why do you want to work at this company?", questionType: "textarea" },
  { questionText: "Describe a relevant project or experience.", questionType: "textarea" },
  { questionText: "What is your availability / earliest start date?", questionType: "text" },
  {
    questionText: "Are you authorized to work in the country where this role is based?",
    questionType: "eligibility",
    sensitive: true,
  },
];

export interface GeneratePacketOptions {
  includeCoverLetter?: boolean;
}

/**
 * Generate (or regenerate) the full application packet for an application:
 * tailored resume, optional cover letter, short answers, and a truth check.
 * Everything is grounded in stored facts; unsupported claims are flagged.
 */
export async function generatePacket(applicationId: string, options: GeneratePacketOptions = {}) {
  const application = await db.application.findUniqueOrThrow({
    where: { id: applicationId },
    include: {
      jobPosting: { include: { company: true, questions: true } },
      userProfile: true,
    },
  });
  const settings = await getSettings();
  const facts = await db.profileFact.findMany({ where: { userProfileId: application.userProfileId } });
  const mockFacts = toMockFacts(facts);
  const profileCtx = toProfileContext(application.userProfile);
  const jobCtx = buildJobContext(application.jobPosting);

  // Ensure we have a fit analysis.
  let fit = parseJson<FitAnalysis | null>(application.fitAnalysisJson, null);
  if (!fit) fit = await analyzeFit(applicationId);

  const master = await getMasterResume();
  const masterStructure = getResumeStructure(master);

  // 1) Tailored resume.
  const tailored: TailoredResume = await tailorResume(
    mockFacts,
    jobCtx,
    profileCtx,
    masterStructure,
    fit,
    settings.llmProvider,
  );
  const html = renderResumeHtml(tailored.structured);
  const text = tailored.text || renderResumeText(tailored.structured);

  // 2) Cover letter (optional).
  let cover: GeneratedCoverLetter | null = null;
  if (options.includeCoverLetter ?? true) {
    cover = await generateCoverLetter(mockFacts, jobCtx, profileCtx, fit, settings.llmProvider);
  }

  // 3) Answers — posting questions + standard questions.
  const postingQuestions: AnswerQuestionInput[] = application.jobPosting.questions.map((q) => ({
    questionText: q.questionText,
    questionType: q.questionType,
    sensitive: q.sensitive,
  }));
  const allQuestions = dedupeQuestions([...postingQuestions, ...STANDARD_QUESTIONS]);
  const generated = await generateApplicationAnswers(
    allQuestions,
    mockFacts,
    profileCtx,
    jobCtx,
    settings.llmProvider,
  );

  // 4) Truth check over resume + cover-letter claims.
  const claims: string[] = [
    ...(tailored.summary ? [tailored.summary] : []),
    ...tailored.bulletChanges.map((b) => b.after).filter(Boolean),
    ...(cover ? splitSentences(cover.text) : []),
  ];
  const truth = await truthCheck(claims, mockFacts, settings.llmProvider);

  // ---- Persist (replace prior generated artifacts for this application) ----
  await db.$transaction(async (tx) => {
    await tx.resumeVersion.deleteMany({ where: { applicationId } });
    await tx.coverLetter.deleteMany({ where: { applicationId } });
    await tx.applicationAnswer.deleteMany({ where: { applicationId } });

    const resumeId = master?.id;
    if (resumeId) {
      await tx.resumeVersion.create({
        data: {
          resumeId,
          jobPostingId: application.jobPostingId,
          applicationId,
          name: `${application.jobPosting.company.name} — ${application.jobPosting.title}`,
          tailoredText: text,
          structuredJson: toJson(tailored.structured),
          htmlPreview: html,
          truthCheckJson: toJson(truth),
          keywordCoverageJson: toJson(tailored.keywordCoverage),
        },
      });
    }

    if (cover) {
      await tx.coverLetter.create({
        data: {
          applicationId,
          text: cover.text,
          supportingFactIdsJson: toJson(cover.supportingFactIds),
          unsupportedClaimsJson: toJson(cover.unsupportedClaims),
        },
      });
    }

    // Map generated answers back to posting JobQuestion rows where possible.
    const questionByText = new Map(
      application.jobPosting.questions.map((q) => [q.questionText.toLowerCase(), q.id]),
    );
    for (const ans of generated.answers) {
      const status = truthStatusForAnswer(ans);
      await tx.applicationAnswer.create({
        data: {
          applicationId,
          jobQuestionId: questionByText.get(ans.questionText.toLowerCase()) ?? null,
          questionLabel: ans.questionText,
          answerText: ans.answerText,
          supportingFactIdsJson: toJson(ans.supportingFactIds),
          truthCheckStatus: status,
          confidence: ans.confidence,
          sensitive: ans.sensitive,
          needsUserInput: ans.needsUserInput,
          userApproved: false,
        },
      });
    }

    await tx.application.update({
      where: { id: applicationId },
      data: {
        status: application.status === "submitted" ? application.status : "ready-for-review",
        resumeVersionLabel: master ? master.baseType : null,
      },
    });
  });

  await recordAudit("Application", applicationId, "generate.packet", {
    answers: generated.answers.length,
    coverLetter: Boolean(cover),
    unsupportedClaims: truth.unsupported.length,
    weakClaims: truth.weak.length,
  });

  return {
    tailored,
    html,
    text,
    cover,
    answers: generated.answers,
    truth,
    keywordCoverage: tailored.keywordCoverage,
    fit,
  };
}

export function truthStatusForAnswer(ans: {
  sensitive: boolean;
  needsUserInput: boolean;
  supportingFactIds: string[];
  answerText: string;
}): TruthCheckStatus {
  if (ans.sensitive) return "sensitive";
  if (ans.needsUserInput || !ans.answerText.trim()) return "needs-input";
  if (ans.supportingFactIds.length > 0) return "supported";
  return "weak";
}

function dedupeQuestions(questions: AnswerQuestionInput[]): AnswerQuestionInput[] {
  const seen = new Set<string>();
  const out: AnswerQuestionInput[] = [];
  for (const q of questions) {
    const key = q.questionText.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(q);
  }
  return out;
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25 && !/^(dear|sincerely|thank you)/i.test(s));
}
