import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureDatabaseReady } from "@/lib/runtime-db";
import { renderResumeHtml } from "@/lib/services/resume";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  await ensureDatabaseReady();
  const { id } = await params;
  const version = await prisma.resumeVersion.findUnique({ where: { id } });
  if (!version) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(renderResumeHtml(version.tailoredText), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
