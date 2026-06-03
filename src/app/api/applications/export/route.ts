import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { STATUS_LABELS, type ApplicationStatus } from "@/lib/constants";
import { format } from "date-fns";

function csvCell(value: string | null | undefined): string {
  const v = value ?? "";
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

/** Export all applications as CSV for the tracker. */
export async function GET() {
  const apps = await db.application.findMany({
    include: { jobPosting: { include: { company: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const headers = [
    "Company",
    "Role",
    "Status",
    "Fit",
    "Mode",
    "Deadline",
    "Applied",
    "Resume version",
    "Source",
    "Referral",
    "Recruiter",
    "Follow-up",
    "Outcome",
  ];

  const rows = apps.map((a) =>
    [
      a.jobPosting.company.name,
      a.jobPosting.title,
      STATUS_LABELS[a.status as ApplicationStatus] ?? a.status,
      a.fitScore?.toString() ?? "",
      a.applicationMode,
      a.jobPosting.deadline ? format(a.jobPosting.deadline, "yyyy-MM-dd") : "",
      a.submittedAt ? format(a.submittedAt, "yyyy-MM-dd") : "",
      a.resumeVersionLabel ?? "",
      a.source ?? a.jobPosting.sourceName ?? "",
      a.referralContact ?? "",
      a.recruiterContact ?? "",
      a.followUpDate ? format(a.followUpDate, "yyyy-MM-dd") : "",
      a.outcome ?? "",
    ]
      .map(csvCell)
      .join(","),
  );

  const csv = [headers.join(","), ...rows].join("\n");
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="internpilot-applications-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}
