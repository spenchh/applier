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

const keywordTerms = [
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
  "figma",
  "ux",
  "user research",
  "wireframes",
  "content strategy",
  "marketing",
  "social media",
  "campaigns",
  "brand",
  "copywriting",
  "finance",
  "financial modeling",
  "valuation",
  "accounting",
  "excel",
  "consulting",
  "market research",
  "strategy",
  "operations",
  "process improvement",
  "supply chain",
  "policy",
  "public policy",
  "legal",
  "communications",
  "writing",
  "research",
  "qualitative",
  "quantitative",
  "customer success",
  "sales",
  "business development",
  "hr",
  "people operations",
  "event planning",
  "project management",
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
  return keywordTerms.filter((term) => {
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
      "design",
      "marketing",
      "finance",
      "operations",
      "strategy",
      "policy",
      "communications",
      "sales",
      "research",
      "customer",
      "writing",
      "presentation",
      "stakeholder",
    ].includes(token),
  );
  return unique([...technologies, ...common]).slice(0, 18);
}

export const roleCategories = [
  "software_engineering",
  "data_analytics",
  "product_management",
  "design_ux",
  "marketing",
  "finance",
  "consulting",
  "research",
  "operations",
  "policy_legal",
  "communications",
  "sales_business_development",
  "people_hr",
  "general_internship",
] as const;

export function inferRoleCategory(title: string, description = ""): string {
  const value = `${title} ${description}`.toLowerCase();
  if (/software|developer|frontend|backend|full.?stack|engineering/.test(value)) return "software_engineering";
  if (/data|analytics|analyst|business intelligence|sql|tableau/.test(value)) return "data_analytics";
  if (/product manager|product management|pm intern/.test(value)) return "product_management";
  if (/design|ux|ui|figma|user research|creative/.test(value)) return "design_ux";
  if (/marketing|brand|campaign|social media|growth/.test(value)) return "marketing";
  if (/finance|investment|accounting|valuation|treasury/.test(value)) return "finance";
  if (/consulting|strategy|case|market research/.test(value)) return "consulting";
  if (/research|lab|policy research|clinical/.test(value)) return "research";
  if (/operations|supply chain|logistics|process/.test(value)) return "operations";
  if (/policy|legal|government|public affairs/.test(value)) return "policy_legal";
  if (/communications|writing|editorial|content|public relations|pr\b/.test(value)) return "communications";
  if (/sales|business development|account|customer success/.test(value)) return "sales_business_development";
  if (/human resources|people|talent|recruiting/.test(value)) return "people_hr";
  return "general_internship";
}

export function roleCategoryLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .replace("Ux", "UX")
    .replace("Hr", "HR");
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
