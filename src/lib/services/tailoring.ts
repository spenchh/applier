import { prisma } from "../db";
import { readJson, toList, writeJson } from "../json";
import { generateAnswerMock, generateCoverLetterMock, generateTailoredResumeText } from "../llm";
import { chooseApplicationMode } from "../adapters";
import { calculateFit } from "./fit";
import { getMasterResume } from "./resume";

export async function generateApplicationPacket(jobPostingId: string, userProfileId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userProfileId },
    include: { facts: true },
  });
  const job = await prisma.jobPosting.findUnique({
    where: { id: jobPostingId },
    include: { company: true, questions: true },
  });
  if (!profile || !job) throw new Error("Profile or job not found");

  const fit = calculateFit(job, profile.facts);
  const application = await prisma.application.upsert({
    where: {
      id:
        (
          await prisma.application.findFirst({
            where: { userProfileId, jobPostingId },
            select: { id: true },
          })
        )?.id ?? "new",
    },
    update: {
      status: "ready for review",
      fitScore: fit.fitScore,
      fitAnalysisJson: writeJson(fit),
      applicationMode: chooseApplicationMode(job.sourceUrl),
    },
    create: {
      userProfileId,
      jobPostingId,
      status: "ready for review",
      applicationMode: chooseApplicationMode(job.sourceUrl),
      fitScore: fit.fitScore,
      fitAnalysisJson: writeJson(fit),
      source: job.sourceName,
    },
  });

  const master = await getMasterResume(userProfileId);
  if (master) {
    await prisma.resumeVersion.deleteMany({ where: { applicationId: application.id } });
    const tailored = generateTailoredResumeText({
      profileName: profile.preferredName || profile.legalName,
      email: profile.email,
      location: profile.location,
      jobTitle: job.title,
      company: job.company.name,
      facts: profile.facts,
      keywords: toList(job.keywords),
    });
    await prisma.resumeVersion.create({
      data: {
        resumeId: master.id,
        jobPostingId: job.id,
        applicationId: application.id,
        name: `${job.company.name} ${job.title} Tailored Resume`,
        tailoredText: tailored.text,
        structuredJson: master.structuredJson,
        truthCheckJson: writeJson(tailored.truthCheck),
        keywordCoverageJson: writeJson(tailored.keywordCoverage),
      },
    });
  }

  await prisma.coverLetter.deleteMany({ where: { applicationId: application.id } });
  const cover = generateCoverLetterMock({
    preferredName: profile.preferredName || profile.legalName,
    company: job.company.name,
    role: job.title,
    facts: profile.facts,
  });
  await prisma.coverLetter.create({
    data: {
      applicationId: application.id,
      text: cover.text,
      supportingFactIdsJson: writeJson(cover.supportingFactIds),
    },
  });

  await prisma.applicationAnswer.deleteMany({ where: { applicationId: application.id } });
  for (const question of job.questions) {
    const answer = generateAnswerMock(question.questionText, profile.facts);
    await prisma.applicationAnswer.create({
      data: {
        applicationId: application.id,
        jobQuestionId: question.id,
        answerText: answer.answerText,
        supportingFactIdsJson: writeJson(answer.supportingFactIds),
        truthCheckStatus: answer.truthCheckStatus,
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      entityType: "Application",
      entityId: application.id,
      action: "packet.generate",
      metadataJson: writeJson({ fitScore: fit.fitScore, job: job.title }),
    },
  });

  return prisma.application.findUniqueOrThrow({
    where: { id: application.id },
    include: {
      jobPosting: { include: { company: true, questions: true } },
      resumeVersions: true,
      coverLetters: true,
      answers: { include: { jobQuestion: true } },
    },
  });
}

export function getFitAnalysis(application: { fitAnalysisJson: string | null }) {
  return readJson(application.fitAnalysisJson, null);
}
