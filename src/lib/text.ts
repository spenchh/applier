import crypto from "node:crypto";

const restrictedHosts = [
  "linkedin.com",
  "indeed.com",
  "joinhandshake.com",
  "handshake.com",
  "simplify.jobs",
  "ripplematch.com",
];

const knownAtsHosts: Record<string, string> = {
  "greenhouse.io": "greenhouse",
  "boards.greenhouse.io": "greenhouse",
  "lever.co": "lever",
  "jobs.lever.co": "lever",
  "ashbyhq.com": "ashby",
  "jobs.ashbyhq.com": "ashby",
  "smartrecruiters.com": "smartrecruiters",
  "jobs.smartrecruiters.com": "smartrecruiters",
};

const technologyTerms = [
  "python",
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node",
  "sql",
  "postgresql",
  "sqlite",
  "prisma",
  "git",
  "java",
  "c++",
  "aws",
  "tableau",
  "excel",
  "pandas",
  "machine learning",
  "api",
  "rest",
  "graphql",
];

export function normalizeText(value: string): string {
  return value.toLowerCase().replace(/https?:\/\//g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

export function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function dedupeHash(input: {
  company?: string | null;
  title?: string | null;
  location?: string | null;
  sourceUrl?: string | null;
  rawDescription?: string | null;
}): string {
  const url = input.sourceUrl ? normalizeText(input.sourceUrl.replace(/^https?:\/\//, "")) : "";
  const description = normalizeText(input.rawDescription ?? "").slice(0, 600);
  const basis = [input.company, input.title, input.location, url, description]
    .map((part) => normalizeText(part ?? ""))
    .join("|");
  return crypto.createHash("sha256").update(basis).digest("hex");
}

export function tokenize(value: string): string[] {
  return unique(
    normalizeText(value)
      .split(" ")
      .filter((token) => token.length > 2),
  );
}

export function extractTechnologies(text: string): string[] {
  const normalized = ` ${text.toLowerCase()} `;
  return technologyTerms.filter((term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, "i").test(normalized);
  });
}

export function extractKeywords(text: string): string[] {
  const technologies = extractTechnologies(text);
  const common = tokenize(text).filter((token) =>
    [
      "intern",
      "engineering",
      "software",
      "data",
      "analysis",
      "dashboard",
      "collaboration",
      "communication",
      "product",
      "research",
      "testing",
      "automation",
      "analytics",
      "database",
    ].includes(token),
  );
  return unique([...technologies, ...common]).slice(0, 18);
}

export function detectRiskFlags(text: string, sourceUrl?: string | null): string[] {
  const value = `${text} ${sourceUrl ?? ""}`.toLowerCase();
  const flags: string[] = [];
  if (/pay.*(fee|deposit|training)|application fee|wire transfer|payment forwarding/.test(value)) {
    flags.push("Posting mentions payment, deposit, or transfer language.");
  }
  if (/telegram|whatsapp|signal only|messaging app only/.test(value)) {
    flags.push("Interview or contact appears to rely on messaging apps only.");
  }
  if (/unrealistic|earn \$?\d{3,}.*day|crypto/.test(value)) {
    flags.push("Compensation or crypto language may be unrealistic.");
  }
  if (!/https?:\/\/|www\.|@[a-z0-9.-]+\.[a-z]{2,}/i.test(value)) {
    flags.push("No company website or verifiable contact appears in the posting.");
  }
  if (/passport|ssn|social security|bank account/.test(value)) {
    flags.push("Sensitive personal information is requested unusually early.");
  }
  return flags;
}

export function isSensitiveQuestion(question: string): boolean {
  return /citizenship|visa|sponsor|authorized|disability|veteran|gender|race|ethnicity|date of birth|ssn|social security|demographic/i.test(
    question,
  );
}

export function getHost(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function isRestrictedPlatform(url: string | null | undefined): boolean {
  const host = getHost(url);
  if (!host) return false;
  return restrictedHosts.some((restricted) => host === restricted || host.endsWith(`.${restricted}`));
}

export function detectAtsProvider(url: string | null | undefined): string | null {
  const host = getHost(url);
  if (!host) return null;
  for (const [knownHost, provider] of Object.entries(knownAtsHosts)) {
    if (host === knownHost || host.endsWith(`.${knownHost}`)) return provider;
  }
  return null;
}

export function splitInterestingLines(text: string): string[] {
  return unique(
    text
      .split(/\r?\n|•|- /)
      .map((line) => line.trim())
      .filter((line) => line.length > 8),
  ).slice(0, 16);
}
