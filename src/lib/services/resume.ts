import { prisma } from "../db";
import { parseResumeMock } from "../llm";
import { writeJson } from "../json";
import { ensureDatabaseReady } from "../runtime-db";

export async function createResume(input: {
  userProfileId: string;
  name: string;
  baseType: string;
  rawText: string;
  isMaster?: boolean;
}) {
  await ensureDatabaseReady();
  if (input.isMaster) {
    await prisma.resume.updateMany({
      where: { userProfileId: input.userProfileId },
      data: { isMaster: false },
    });
  }

  const resume = await prisma.resume.create({
    data: {
      userProfileId: input.userProfileId,
      name: input.name,
      baseType: input.baseType,
      rawText: input.rawText,
      structuredJson: writeJson(parseResumeMock(input.rawText)),
      isMaster: input.isMaster ?? false,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "Resume",
      entityId: resume.id,
      action: "resume.create",
      metadataJson: writeJson({ name: resume.name, baseType: resume.baseType }),
    },
  });

  return resume;
}

export async function getMasterResume(userProfileId: string) {
  await ensureDatabaseReady();
  const master = await prisma.resume.findFirst({
    where: { userProfileId, isMaster: true },
    orderBy: { updatedAt: "desc" },
  });
  if (master) return master;
  return prisma.resume.findFirst({
    where: { userProfileId },
    orderBy: { updatedAt: "desc" },
  });
}

export function renderResumeHtml(text: string) {
  const lines = text.split("\n");
  return [
    "<!doctype html><html><head><meta charset=\"utf-8\"><title>Resume Preview</title>",
    "<style>body{font-family:Arial,sans-serif;margin:40px;color:#111827;line-height:1.45}h1{font-size:24px;margin:0}h2{font-size:13px;letter-spacing:.08em;margin-top:22px;border-bottom:1px solid #d1d5db}.bullet{margin-left:18px}</style>",
    "</head><body>",
    ...lines.map((line, index) => {
      if (index === 0) return `<h1>${escapeHtml(line)}</h1>`;
      if (/^[A-Z][A-Z ]+$/.test(line)) return `<h2>${escapeHtml(line)}</h2>`;
      if (line.startsWith("- ")) return `<div class="bullet">${escapeHtml(line)}</div>`;
      return `<p>${escapeHtml(line)}</p>`;
    }),
    "</body></html>",
  ].join("");
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}
