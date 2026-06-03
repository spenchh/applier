import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const [profiles, companies, jobs, applications, auditLogs] = await Promise.all([
    prisma.userProfile.findMany({ include: { facts: true, resumes: true } }),
    prisma.company.findMany(),
    prisma.jobPosting.findMany({ include: { questions: true } }),
    prisma.application.findMany({ include: { answers: true, coverLetters: true, resumeVersions: true, submissionAttempts: true } }),
    prisma.auditLog.findMany(),
  ]);
  return NextResponse.json({ profiles, companies, jobs, applications, auditLogs });
}
