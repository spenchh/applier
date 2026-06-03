import crypto from "node:crypto";

/**
 * Job deduplication. We combine a strong key (company + title + location +
 * source URL) with a fuzzy description-similarity check so near-identical
 * re-imports are caught even when one field differs.
 */

function normalize(s: string | null | undefined): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

export interface DedupeKeyInput {
  company: string;
  title: string;
  location?: string | null;
  sourceUrl?: string | null;
}

/** Stable hash of the strong dedupe key. */
export function dedupeHash(input: DedupeKeyInput): string {
  // Strip the protocol BEFORE normalizing so http:// and https:// collapse to
  // the same key (normalize removes the "://" itself, so it must run after).
  const url = (input.sourceUrl ?? "").replace(/^https?:\/\//i, "");
  const key = [
    normalize(input.company),
    normalize(input.title),
    normalize(input.location),
    normalize(url),
  ].join("|");
  return crypto.createHash("sha1").update(key).digest("hex");
}

/** Jaccard similarity of word sets — cheap, dependency-free fuzzy match. */
export function descriptionSimilarity(a: string, b: string): number {
  const setA = new Set(normalize(a).split(" ").filter((w) => w.length > 3));
  const setB = new Set(normalize(b).split(" ").filter((w) => w.length > 3));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const w of setA) if (setB.has(w)) intersection += 1;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export interface DuplicateCandidate {
  id: string;
  dedupeHash: string | null;
  rawDescription: string | null;
}

export interface DuplicateMatch {
  id: string;
  reason: "exact-key" | "similar-description";
  similarity?: number;
}

/**
 * Decide whether `incoming` duplicates any of `existing`.
 * - Exact strong-key hash match => duplicate.
 * - Same company+title but description similarity >= 0.8 => duplicate.
 */
export function findDuplicate(
  incoming: { hash: string; description: string },
  existing: DuplicateCandidate[],
  threshold = 0.8,
): DuplicateMatch | null {
  for (const cand of existing) {
    if (cand.dedupeHash && cand.dedupeHash === incoming.hash) {
      return { id: cand.id, reason: "exact-key" };
    }
  }
  for (const cand of existing) {
    if (!cand.rawDescription) continue;
    const sim = descriptionSimilarity(incoming.description, cand.rawDescription);
    if (sim >= threshold) {
      return { id: cand.id, reason: "similar-description", similarity: sim };
    }
  }
  return null;
}
