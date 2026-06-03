import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderResumeHtml } from "@/lib/services/resume";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const version = await prisma.resumeVersion.findUnique({ where: { id } });
  if (!version) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(renderResumeHtml(version.tailoredText), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
