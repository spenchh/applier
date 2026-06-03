import crypto from "node:crypto";
import { env } from "./env";

/**
 * Lightweight AES-256-GCM helper for encrypting sensitive profile fields at
 * rest. Values are stored as `enc:v1:<iv>:<tag>:<ciphertext>` (base64 parts).
 *
 * Notes / limitations (documented in README):
 *  - In development with no ENCRYPTION_KEY set, a deterministic dev key is
 *    derived so the app still runs. This is NOT secure — set ENCRYPTION_KEY in
 *    any real deployment. We log a one-time warning in that case.
 *  - This is field-level application encryption, not full-disk or column TDE.
 */

const PREFIX = "enc:v1:";
let warned = false;

function getKey(): Buffer {
  const raw = env.encryptionKey;
  if (raw) {
    // Accept base64 or hex or raw passphrase; always derive a 32-byte key.
    return crypto.createHash("sha256").update(raw).digest();
  }
  if (!warned && process.env.NODE_ENV !== "test") {
    warned = true;
    // eslint-disable-next-line no-console
    console.warn(
      "[encryption] ENCRYPTION_KEY is not set — using an insecure development key. Do NOT use this in production.",
    );
  }
  return crypto.createHash("sha256").update("internpilot-dev-insecure-key").digest();
}

export function encrypt(plain: string | null | undefined): string | null {
  if (plain === null || plain === undefined || plain === "") return plain ?? null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX +
    [iv.toString("base64"), tag.toString("base64"), ciphertext.toString("base64")].join(":")
  );
}

export function decrypt(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return value ?? null;
  if (!value.startsWith(PREFIX)) return value; // tolerate legacy/plaintext values
  try {
    const [ivB64, tagB64, dataB64] = value.slice(PREFIX.length).split(":");
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      getKey(),
      Buffer.from(ivB64, "base64"),
    );
    decipher.setAuthTag(Buffer.from(tagB64, "base64"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(dataB64, "base64")),
      decipher.final(),
    ]);
    return plain.toString("utf8");
  } catch {
    // If decryption fails (e.g. key rotated), fail closed to null rather than
    // surfacing ciphertext.
    return null;
  }
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}
