import { Document, HeadingLevel, Packer, Paragraph, TextRun } from "docx";
import { prisma } from "../db";
import { writeJson } from "../json";
import { ensureDatabaseReady } from "../runtime-db";
import type { ResumeStructure } from "../schemas";
import { resumeStructureSchema, resumeUploadSchema } from "../schemas";

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
      structuredJson: writeJson(parseResumeStructure(input.rawText)),
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

export async function createUploadedResume(input: {
  userProfileId: string;
  name: string;
  baseType: string;
  isMaster?: boolean;
  filename: string;
  mimeType: string;
  size: number;
  rawText: string;
}) {
  resumeUploadSchema.parse({
    name: input.name,
    baseType: input.baseType,
    isMaster: input.isMaster ?? true,
    filename: input.filename,
    mimeType: input.mimeType,
    size: input.size,
  });
  const resume = await createResume({
    userProfileId: input.userProfileId,
    name: input.name,
    baseType: input.baseType,
    rawText: input.rawText,
    isMaster: input.isMaster,
  });

  await prisma.fileAsset.create({
    data: {
      userProfileId: input.userProfileId,
      type: "resume_upload",
      filename: sanitizeFilename(input.filename),
      path: `db:resume:${resume.id}`,
      mimeType: input.mimeType,
      size: input.size,
    },
  });

  await prisma.auditLog.create({
    data: {
      entityType: "FileAsset",
      entityId: resume.id,
      action: "resume.upload",
      metadataJson: writeJson({ filename: sanitizeFilename(input.filename), mimeType: input.mimeType, size: input.size }),
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

export function parseResumeStructure(rawText: string): ResumeStructure {
  const lines = normalizeResumeText(rawText)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const sections: ResumeStructure["sections"] = [];
  const nameLine = lines[0];
  const contactLine = lines[1] && looksLikeContactLine(lines[1]) ? lines[1] : undefined;
  let current: { heading: string; items: string[] } | null = null;
  const startIndex = contactLine ? 2 : 1;

  for (const line of lines.slice(startIndex)) {
    if (looksLikeHeading(line)) {
      current = { heading: normalizeHeading(line), items: [] };
      sections.push(current);
      continue;
    }
    if (!current) {
      current = { heading: "Summary", items: [] };
      sections.push(current);
    }
    current.items.push(line.replace(/^[-•]\s*/, ""));
  }

  const skills = sections
    .find((section) => /skills/i.test(section.heading))
    ?.items.flatMap((item) => item.split(/,|;|\|/).map((skill) => skill.trim()).filter(Boolean)) ?? [];

  return resumeStructureSchema.parse({
    nameLine,
    contactLine,
    sections: sections.length ? sections : [{ heading: "Summary", items: lines.slice(1) }],
    skills,
  });
}

export function normalizeResumeText(rawText: string): string {
  return rawText
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function extractResumeTextFromFile(input: { bytes: Uint8Array; mimeType: string }) {
  if (input.mimeType === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: Buffer.from(input.bytes) });
    try {
      const result = await parser.getText();
      return normalizeResumeText(result.text);
    } finally {
      await parser.destroy();
    }
  }

  if (input.mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer: Buffer.from(input.bytes) });
    return normalizeResumeText(result.value);
  }

  throw new Error("Unsupported resume file type.");
}

export async function buildResumeDocxBuffer(input: { text: string; structuredJson?: string | null }) {
  const structure = parseStructuredJson(input.structuredJson) ?? parseResumeStructure(input.text);
  const children: Paragraph[] = [];

  if (structure.nameLine) {
    children.push(new Paragraph({ text: structure.nameLine, heading: HeadingLevel.TITLE }));
  }
  if (structure.contactLine) {
    children.push(new Paragraph({ children: [new TextRun({ text: structure.contactLine, size: 20 })] }));
  }

  for (const section of structure.sections) {
    if (!section.items.length) continue;
    children.push(new Paragraph({ text: section.heading, heading: HeadingLevel.HEADING_2 }));
    for (const item of section.items) {
      const bullet = /^[-•]/.test(item);
      children.push(
        new Paragraph({
          children: [new TextRun({ text: item.replace(/^[-•]\s*/, ""), size: 21 })],
          bullet: bullet || shouldBullet(section.heading) ? { level: 0 } : undefined,
        }),
      );
    }
  }

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        children: children.length ? children : [new Paragraph(input.text)],
      },
    ],
  });

  return Packer.toBuffer(document);
}

export function sanitizeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._ -]/g, "_").replace(/\s+/g, " ").trim().slice(0, 120) || "resume";
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function looksLikeContactLine(line: string) {
  return /@|https?:|linkedin|github|\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/i.test(line);
}

function looksLikeHeading(line: string) {
  const normalized = line.trim();
  if (normalized.length > 42) return false;
  if (/^[A-Z][A-Z &/+-]+$/.test(normalized)) return true;
  return /^(summary|education|experience|work experience|projects|skills|awards|certifications|leadership|activities|coursework|publications)$/i.test(normalized);
}

function normalizeHeading(line: string) {
  return line
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .replace("And", "and")
    .replace("Ux", "UX")
    .trim();
}

function shouldBullet(heading: string) {
  return !/summary|skills/i.test(heading);
}

function parseStructuredJson(value: string | null | undefined): ResumeStructure | null {
  if (!value) return null;
  try {
    return resumeStructureSchema.parse(JSON.parse(value));
  } catch {
    return null;
  }
}
