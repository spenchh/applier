import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDatabaseReady } from "@/lib/runtime-db";
import { buildResumeDocxBuffer, sanitizeFilename } from "@/lib/services/resume";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("/resumes");
  await ensureDatabaseReady();
  const { id } = await params;
  const version = await prisma.resumeVersion.findFirst({
    where: {
      id,
      resume: { userProfile: { userAccountId: user.id } },
    },
    include: {
      jobPosting: { include: { company: true } },
      resume: true,
    },
  });
  if (!version) return new NextResponse("Not found", { status: 404 });

  const buffer = await buildResumeDocxBuffer({
    text: version.tailoredText,
    structuredJson: version.structuredJson,
  });
  const filename = sanitizeFilename(
    `${version.jobPosting?.company.name ?? "InternPilot"} ${version.jobPosting?.title ?? version.name} Resume.docx`,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
