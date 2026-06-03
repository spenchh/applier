import { db } from "../db";
import { toJson, parseJson } from "../utils";
import { recordAudit } from "../audit";
import { parseResume } from "../llm";
import type { ResumeStructure } from "../llm/types";
import { resumeStructureSchema } from "../llm/types";
import type { ResumeBaseType } from "../constants";
import { getOrCreateProfile } from "./profile-service";
import { getSettings } from "./settings-service";

export async function listResumes() {
  const profile = await getOrCreateProfile();
  return db.resume.findMany({
    where: { userProfileId: profile.id },
    orderBy: [{ isMaster: "desc" }, { createdAt: "desc" }],
  });
}

export async function getResume(id: string) {
  return db.resume.findUnique({ where: { id }, include: { versions: true } });
}

export async function getMasterResume() {
  const profile = await getOrCreateProfile();
  return db.resume.findFirst({
    where: { userProfileId: profile.id, isMaster: true },
    orderBy: { updatedAt: "desc" },
  });
}

export function getResumeStructure(resume: { structuredJson: string | null } | null): ResumeStructure | null {
  if (!resume) return null;
  const parsed = parseJson<unknown>(resume.structuredJson, null);
  if (!parsed) return null;
  const result = resumeStructureSchema.safeParse(parsed);
  return result.success ? result.data : null;
}

export interface CreateResumeInput {
  name: string;
  baseType: ResumeBaseType;
  rawText?: string;
  isMaster?: boolean;
}

/** Create a resume; if rawText is provided, parse it into structured sections. */
export async function createResume(input: CreateResumeInput) {
  const profile = await getOrCreateProfile();
  const settings = await getSettings();

  let structured: ResumeStructure | null = null;
  if (input.rawText?.trim()) {
    structured = await parseResume(input.rawText, settings.llmProvider);
  }

  if (input.isMaster) {
    // Only one master at a time.
    await db.resume.updateMany({
      where: { userProfileId: profile.id, isMaster: true },
      data: { isMaster: false },
    });
  }

  const resume = await db.resume.create({
    data: {
      userProfileId: profile.id,
      name: input.name,
      baseType: input.baseType,
      rawText: input.rawText || null,
      structuredJson: structured ? toJson(structured) : null,
      isMaster: Boolean(input.isMaster),
    },
  });
  await recordAudit("Resume", resume.id, "create.resume", { baseType: resume.baseType, parsed: Boolean(structured) });
  return resume;
}

export async function updateResumeStructure(id: string, structured: ResumeStructure) {
  const validated = resumeStructureSchema.parse(structured);
  const resume = await db.resume.update({
    where: { id },
    data: { structuredJson: toJson(validated) },
  });
  await recordAudit("Resume", id, "update.resume", {});
  return resume;
}

export async function deleteResume(id: string) {
  await db.resume.delete({ where: { id } });
  await recordAudit("Resume", id, "delete.resume", {});
}
