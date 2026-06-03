import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ensureDatabaseReady } from "@/lib/runtime-db";
import { renderResumeHtml } from "@/lib/services/resume";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("/resumes");
  await ensureDatabaseReady();
  const { id } = await params;
  const version = await prisma.resumeVersion.findFirst({
    where: {
      id,
      resume: { userProfile: { userAccountId: user.id } },
    },
  });
  if (!version) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(renderResumeHtml(version.tailoredText), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
