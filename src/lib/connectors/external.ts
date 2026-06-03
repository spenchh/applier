import type { DiscoveryQuery, NormalizedSourcedJob } from "./types";

const DEFAULT_TIMEOUT_MS = 8000;

export function discoveryUserAgent() {
  return process.env.DISCOVERY_USER_AGENT || process.env.USAJOBS_USER_AGENT || "InternPilot/1.0 candidate-side job discovery";
}

export async function fetchJson<T>(url: URL, headers: Record<string, string> = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": discoveryUserAgent(),
        ...headers,
      },
      signal: controller.signal,
    });
    if (response.status === 429) throw new Error("Rate limit reached. Try again later.");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

export function inferWorkplaceType(...values: Array<string | null | undefined>) {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  if (/\bremote\b/.test(text)) return "remote";
  if (/\bhybrid\b/.test(text)) return "hybrid";
  if (/\bonsite\b|on-site|office/.test(text)) return "onsite";
  return undefined;
}

export function inferInternshipTerm(...values: Array<string | null | undefined>) {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  if (/\bsummer\b/.test(text)) return "summer";
  if (/\bfall\b|autumn/.test(text)) return "fall";
  if (/\bspring\b/.test(text)) return "spring";
  if (/\bwinter\b/.test(text)) return "winter";
  return undefined;
}

export function stripHtml(value: string | null | undefined) {
  return (value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasAuthFriendlyLanguage(text: string) {
  return /visa sponsorship|sponsor.+available|eligible to sponsor|work authorization not required|open to international/i.test(text);
}

export function hasWorkAuthNotRequiredLanguage(text: string) {
  return /work authorization not required|no us work authorization required|global remote|anywhere/i.test(text);
}

export function withFallbackDescription(job: NormalizedSourcedJob) {
  if (job.rawDescription.trim().length >= 20) return job;
  return {
    ...job,
    rawDescription: `${job.title} at ${job.company}. ${job.location ?? ""}`.trim(),
  };
}

export function queryKeyword(query: DiscoveryQuery) {
  return query.keyword?.trim() || "internship";
}
