import { db } from "./db";

/**
 * Append-only audit logging for generation, approval, and submission actions.
 *
 * SECURITY: never pass full resumes, profile facts, secrets, or sensitive
 * answers in `metadata`. Pass counts, ids, statuses, and short labels only.
 * `sanitizeMetadata` strips obviously-sensitive keys as a backstop.
 */

const SENSITIVE_KEYS = [
  "apikey",
  "api_key",
  "key",
  "secret",
  "token",
  "password",
  "resume",
  "rawtext",
  "answertext",
  "coverletter",
  "ssn",
  "phone",
  "email",
];

function sanitizeMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(metadata)) {
    if (SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s))) {
      out[k] = "[redacted]";
      continue;
    }
    if (typeof v === "string" && v.length > 200) {
      out[k] = `[${v.length} chars]`;
    } else {
      out[k] = v;
    }
  }
  return out;
}

export async function recordAudit(
  entityType: string,
  entityId: string,
  action: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        entityType,
        entityId,
        action,
        metadataJson: JSON.stringify(sanitizeMetadata(metadata)),
      },
    });
  } catch {
    // Audit logging must never break the primary action.
  }
}

export async function getAuditLog(entityType?: string, entityId?: string, limit = 100) {
  return db.auditLog.findMany({
    where: {
      ...(entityType ? { entityType } : {}),
      ...(entityId ? { entityId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
