import { NextResponse } from "next/server";
import { listApplications } from "@/lib/services/application";

export const dynamic = "force-dynamic";

export async function GET() {
  const applications = await listApplications();
  const rows = [
    ["company", "role", "status", "mode", "fit_score", "submitted_at", "source"],
    ...applications.map((application) => [
      application.jobPosting.company.name,
      application.jobPosting.title,
      application.status,
      application.applicationMode,
      String(application.fitScore),
      application.submittedAt?.toISOString() ?? "",
      application.source ?? "",
    ]),
  ];
  const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=applications.csv",
    },
  });
}
