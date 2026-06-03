import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getResumeStructure } from "@/lib/services/resume-service";
import { renderResumeHtml } from "@/lib/services/resume-render";

/** Serves a base resume's HTML for preview / print-to-PDF. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resume = await db.resume.findUnique({ where: { id } });
  const structure = getResumeStructure(resume);
  if (!structure) {
    return new NextResponse("This resume has no parsed structure yet. Paste resume text to parse it.", {
      status: 404,
    });
  }
  return new NextResponse(renderResumeHtml(structure), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
