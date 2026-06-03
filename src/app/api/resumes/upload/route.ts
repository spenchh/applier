import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { ensureDatabaseReady } from "@/lib/runtime-db";
import { resumeUploadSchema } from "@/lib/schemas";
import { ensureProfile } from "@/lib/services/profile";
import { createUploadedResume, extractResumeTextFromFile, sanitizeFilename } from "@/lib/services/resume";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;
const allowedTypes = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Sign in before uploading a resume." }, { status: 401 });

  await ensureDatabaseReady();
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a PDF or DOCX resume file." }, { status: 400 });
  }

  const filename = sanitizeFilename(file.name);
  const mimeType = file.type || mimeTypeFromName(filename);
  if (!allowedTypes.has(mimeType)) {
    return NextResponse.json({ error: "Only PDF and DOCX resume files are supported." }, { status: 400 });
  }
  if (file.size > MAX_RESUME_BYTES) {
    return NextResponse.json({ error: "Resume uploads must be 5 MB or smaller." }, { status: 400 });
  }

  const parsed = resumeUploadSchema.parse({
    name: stringField(formData, "name") || filename.replace(/\.(pdf|docx)$/i, ""),
    baseType: stringField(formData, "baseType") || "general_internship",
    isMaster: booleanField(formData, "isMaster"),
    filename,
    mimeType,
    size: file.size,
  });

  const bytes = new Uint8Array(await file.arrayBuffer());
  const rawText = await extractResumeTextFromFile({ bytes, mimeType });
  if (rawText.length < 20) {
    return NextResponse.json({ error: "The file was readable, but not enough resume text could be extracted." }, { status: 422 });
  }

  const profile = await ensureProfile(user.id, user);
  const resume = await createUploadedResume({
    userProfileId: profile.id,
    name: parsed.name,
    baseType: parsed.baseType,
    isMaster: parsed.isMaster,
    filename: parsed.filename,
    mimeType: parsed.mimeType,
    size: parsed.size,
    rawText,
  });

  return NextResponse.json({
    ok: true,
    resumeId: resume.id,
    name: resume.name,
    extractedCharacters: rawText.length,
  });
}

function stringField(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function booleanField(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

function mimeTypeFromName(filename: string) {
  if (/\.pdf$/i.test(filename)) return "application/pdf";
  if (/\.docx$/i.test(filename)) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "application/octet-stream";
}
