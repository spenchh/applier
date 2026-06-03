import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { format } from "date-fns";

/**
 * Full data export (privacy / portability). Sensitive fields are decrypted into
 * the export so the user has a complete, portable copy of THEIR own data. This
 * file is downloaded directly to the user and never sent anywhere.
 */
export async function GET() {
  const [profile, facts, resumes, companies, jobs, applications, followUps] = await Promise.all([
    db.userProfile.findFirst(),
    db.profileFact.findMany(),
    db.resume.findMany(),
    db.company.findMany(),
    db.jobPosting.findMany({ include: { questions: true } }),
    db.application.findMany({ include: { answers: true, coverLetters: true, resumeVersions: true, attempts: true } }),
    db.followUpTask.findMany(),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    app: "InternPilot",
    profile: profile
      ? { ...profile, phone: decrypt(profile.phone), workAuthorization: decrypt(profile.workAuthorization) }
      : null,
    facts,
    resumes,
    companies,
    jobs,
    applications,
    followUps,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": `attachment; filename="internpilot-export-${format(new Date(), "yyyy-MM-dd")}.json"`,
    },
  });
}
