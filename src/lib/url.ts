import {
  RESTRICTED_PLATFORM_HOSTS,
  ATS_HOST_PATTERNS,
  type AtsProvider,
} from "./constants";

export function parseHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * A restricted platform is one whose terms prohibit scraping/automated applying
 * (LinkedIn, Indeed, Handshake, Simplify, RippleMatch, etc.). For these we
 * ONLY store the URL, allow manual tracking/tailoring, and open the URL — we
 * never fetch/scrape or automate. Imports from these hosts are forced into
 * Manual Mode.
 */
export function isRestrictedPlatform(url: string): boolean {
  const host = parseHost(url);
  if (!host) return false;
  return RESTRICTED_PLATFORM_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

export function detectAtsProvider(url: string): AtsProvider {
  const host = parseHost(url);
  if (!host) return "unknown";
  for (const { provider, pattern } of ATS_HOST_PATTERNS) {
    if (pattern.test(host)) return provider;
  }
  return "unknown";
}

export interface UrlImportPlan {
  url: string;
  host: string | null;
  restricted: boolean;
  atsProvider: AtsProvider;
  /**
   * Whether we may attempt an official/public API import. Only true for known
   * ATS hosts with public job APIs AND not a restricted platform. We never do
   * generic scraping or anything that defeats protections.
   */
  canAttemptOfficialImport: boolean;
  reason: string;
}

export function planUrlImport(url: string): UrlImportPlan {
  const host = parseHost(url);
  const restricted = isRestrictedPlatform(url);
  const atsProvider = detectAtsProvider(url);
  const canAttemptOfficialImport = !restricted && atsProvider !== "unknown";

  let reason = "";
  if (!host) reason = "URL could not be parsed. Paste the job description instead.";
  else if (restricted)
    reason = `${host} restricts automated access. InternPilot will only store the link and Manual Mode tools — paste the description to analyze it.`;
  else if (canAttemptOfficialImport)
    reason = `Detected ${atsProvider}. InternPilot can attempt a public/official import; if it fails, paste the description.`;
  else reason = "Unknown source. InternPilot does not scrape arbitrary sites — paste the job description to analyze it.";

  return { url, host, restricted, atsProvider, canAttemptOfficialImport, reason };
}
