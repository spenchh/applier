import type { Application } from "@prisma/client";
import { adapterFor } from "../adapters";
import { prisma } from "../db";
import { writeJson } from "../json";

export function canSubmitApplication(application: Pick<Application, "approvedAt" | "status">) {
  return Boolean(application.approvedAt) && ["approved", "submitted"].includes(application.status);
}

export async function approveApplication(applicationId: string) {
  const application = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: "approved",
      approvedAt: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "Application",
      entityId: application.id,
      action: "application.approve",
      metadataJson: "{}",
    },
  });

  return application;
}

export async function markSubmitted(applicationId: string) {
  const application = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
  if (!canSubmitApplication(application)) {
    throw new Error("Application must be approved before it can be marked submitted.");
  }
  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: "submitted",
      submittedAt: new Date(),
    },
  });
  await prisma.submissionAttempt.create({
    data: {
      applicationId,
      adapter: application.applicationMode,
      status: "manual_submitted",
      requestSummaryJson: writeJson({ userMarkedSubmitted: true }),
      responseSummaryJson: writeJson({ status: "recorded" }),
    },
  });
  return updated;
}

export async function attemptAdapterSubmission(applicationId: string) {
  const application = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
  const adapter = adapterFor(application.applicationMode);
  const result = await adapter.submitApplication(application);
  await prisma.submissionAttempt.create({
    data: {
      applicationId,
      adapter: adapter.provider,
      status: result.status,
      requestSummaryJson: writeJson({ mode: application.applicationMode }),
      responseSummaryJson: writeJson(result),
      errorMessage: result.status === "failed" ? result.message : null,
    },
  });
  return result;
}

export async function updateApplicationStatus(applicationId: string, status: string) {
  return prisma.application.update({
    where: { id: applicationId },
    data: { status },
  });
}

export async function listApplications() {
  return prisma.application.findMany({
    include: {
      jobPosting: { include: { company: true } },
      resumeVersions: true,
      coverLetters: true,
      answers: true,
      followUps: true,
      submissionAttempts: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getApplication(id: string) {
  return prisma.application.findUnique({
    where: { id },
    include: {
      jobPosting: { include: { company: true, questions: true } },
      resumeVersions: true,
      coverLetters: true,
      answers: { include: { jobQuestion: true } },
      submissionAttempts: { orderBy: { createdAt: "desc" } },
    },
  });
}
