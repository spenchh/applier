import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDatabaseReady } from "@/lib/runtime-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser("/settings");
  await ensureDatabaseReady();
  const [profiles, companies, jobs, applications, auditLogs] = await Promise.all([
    prisma.userProfile.findMany({ where: { userAccountId: user.id }, include: { facts: true, resumes: true } }),
    prisma.company.findMany(),
    prisma.jobPosting.findMany({ where: { userAccountId: user.id }, include: { questions: true } }),
    prisma.application.findMany({ where: { userProfile: { userAccountId: user.id } }, include: { answers: true, coverLetters: true, resumeVersions: true, submissionAttempts: true } }),
    prisma.auditLog.findMany({ where: { entityId: user.id } }),
  ]);
  return NextResponse.json({ profiles, companies, jobs, applications, auditLogs });
}
