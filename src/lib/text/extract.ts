/**
 * Pure, dependency-free text heuristics shared by the mock LLM provider and the
 * services. Keeping these deterministic means risk detection and keyword
 * extraction behave identically regardless of the configured LLM provider, and
 * are unit-testable without any API.
 */

import type { RiskFlag } from "../llm/types";

// A pragmatic vocabulary of tech/skills internships commonly ask for.
export const TECH_VOCAB = [
  "python", "javascript", "typescript", "java", "c++", "c#", "go", "golang", "rust",
  "ruby", "php", "swift", "kotlin", "scala", "r", "matlab", "sql", "nosql",
  "react", "next.js", "nextjs", "vue", "angular", "svelte", "node.js", "nodejs",
  "express", "django", "flask", "fastapi", "spring", "rails", ".net",
  "postgres", "postgresql", "mysql", "sqlite", "mongodb", "redis", "graphql",
  "rest", "grpc", "kafka", "rabbitmq", "elasticsearch",
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "ci/cd", "git",
  "github", "gitlab", "linux", "bash",
  "pandas", "numpy", "scikit-learn", "sklearn", "tensorflow", "pytorch", "keras",
  "spark", "hadoop", "tableau", "power bi", "excel", "looker", "dbt", "airflow",
  "machine learning", "deep learning", "nlp", "computer vision", "data analysis",
  "statistics", "a/b testing", "etl", "data visualization",
  "html", "css", "tailwind", "sass", "figma", "jira", "agile", "scrum",
  "product management", "roadmap", "stakeholder", "user research",
] as const;

export function extractEmails(text: string): string[] {
  const matches = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) ?? [];
  return Array.from(new Set(matches.map((m) => m.toLowerCase())));
}

export function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s)"'<>]+/gi) ?? [];
  return Array.from(new Set(matches));
}

export function extractTechnologies(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const term of TECH_VOCAB) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Boundaries treat letters/digits/+/# as "word" continuation, but NOT ".".
    // This lets "node.js" match as a unit while "PostgreSQL." (trailing period)
    // and "SQL" inside "PostgreSQL" behave correctly.
    const re = new RegExp(`(?<![a-z0-9+#])${escaped}(?![a-z0-9+#])`, "i");
    if (re.test(lower)) found.add(term);
  }
  return Array.from(found);
}

/** Split a block of text into clean candidate bullet/sentence lines. */
export function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•\-*•●▪\d.)]+/, "").trim())
    .filter((l) => l.length > 0);
}

export function guessCompanyAndTitle(text: string): { company: string; title: string } {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  let title = "";
  let company = "";

  for (const line of lines.slice(0, 12)) {
    const titleMatch = line.match(
      /\b((?:software|data|product|machine learning|ml|research|security|backend|frontend|full[\s-]?stack|business|finance|marketing)[\w\s/]*?\b(?:intern(?:ship)?|analyst|engineer|scientist|manager))\b/i,
    );
    if (!title && titleMatch) title = titleMatch[1].trim();

    const companyMatch =
      line.match(/\bat\s+([A-Z][\w&.\- ]{1,40})/) ||
      line.match(/^Company:\s*(.+)$/i) ||
      line.match(/^([A-Z][\w&.\- ]{1,40})\s+is\s+(?:hiring|looking|seeking)/);
    if (!company && companyMatch) company = companyMatch[1].trim();
  }
  if (!title) {
    const anyTitle = text.match(
      /\b([\w\s/]*?\b(?:intern(?:ship)?|analyst|engineer|scientist))\b/i,
    );
    title = anyTitle ? anyTitle[1].trim().slice(0, 60) : "Internship";
  }
  if (!company) company = "Unknown Company";
  return { company, title };
}

export function extractDeadline(text: string): string {
  const m = text.match(
    /(?:apply by|deadline|applications? (?:close|due)|closes?)[:\s]*([A-Za-z]+\s+\d{1,2}(?:,?\s*\d{4})?|\d{1,2}\/\d{1,2}\/\d{2,4})/i,
  );
  return m ? m[1].trim() : "";
}

export function extractCompensation(text: string): string {
  const m = text.match(/\$\s?\d[\d,]*(?:\.\d+)?\s*(?:[-–to]+\s*\$?\d[\d,]*)?\s*(?:\/\s*(?:hr|hour|month|mo|year|yr))?/i);
  return m ? m[0].trim().replace(/\s+/g, " ") : "";
}

/**
 * Deterministic risk-flag detection. This ALWAYS runs (independent of the LLM)
 * because it is a safety feature, not a generation feature.
 *
 * IMPORTANT: We never claim a posting is "safe" — we only surface risk
 * indicators for the user to evaluate.
 */
export function detectRiskFlags(
  text: string,
  meta: { companyWebsite?: string; sourceUrl?: string; emails?: string[]; compensation?: string } = {},
): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const lower = text.toLowerCase();
  const emails = meta.emails ?? extractEmails(text);

  const add = (code: string, label: string, severity: RiskFlag["severity"], detail: string) =>
    flags.push({ code, label, severity, detail });

  // Asks for payment / fees.
  if (/\b(pay|payment|fee|deposit|wire transfer|processing fee|training fee|registration fee)\b/.test(lower) &&
      /\b(upfront|in advance|before starting|to apply|to secure|required)\b/.test(lower)) {
    add("asks-for-payment", "Asks for payment / fees", "high",
      "Legitimate employers never ask applicants to pay to apply or start.");
  }

  // Crypto / payment-forwarding language.
  if (/\b(bitcoin|crypto(?:currency)?|usdt|gift card|western union|moneygram|cash app|venmo|zelle|wire the|reship|forward (?:payments|funds)|process payments)\b/.test(lower)) {
    add("payment-forwarding", "Crypto / money-handling language", "high",
      "Mentions of crypto, gift cards, or forwarding/processing payments are common scam indicators.");
  }

  // Interview by messaging app only.
  if (/\b(telegram|whatsapp|signal|google hangouts|hangouts|skype)\b/.test(lower) &&
      /\b(interview|chat|contact|reach|message)\b/.test(lower)) {
    add("messaging-app-interview", "Interview via messaging app only", "high",
      "Interviews conducted solely over Telegram/WhatsApp/etc. are a frequent scam pattern.");
  }

  // Personal info requested too early.
  if (/\b(ssn|social security|bank account|routing number|driver'?s? license|passport number|date of birth)\b/.test(lower)) {
    add("early-personal-info", "Sensitive personal info requested early", "high",
      "Requests for SSN, bank, or government IDs before an offer are a red flag.");
  }

  // Unrealistic pay.
  const hourly = lower.match(/\$\s?(\d[\d,]*)(?:\.\d+)?\s*\/\s*(?:hr|hour)/);
  if (hourly) {
    const rate = Number(hourly[1].replace(/,/g, ""));
    if (rate > 150) {
      add("unrealistic-pay", "Unusually high pay", "medium",
        `Listed pay (~$${rate}/hr) is far above typical internship rates — verify carefully.`);
    }
  }
  if (/\$\s?\d{3,4}\s*(?:\/\s*day|per day)/.test(lower) || /\bearn \$\d{3,}\b.*\b(?:weekly|per week|a week)\b/.test(lower)) {
    add("unrealistic-pay", "Unrealistic pay claims", "medium", "Pay claims appear too good to be true.");
  }

  // No company website / vague company.
  if (!meta.companyWebsite && extractUrls(text).length === 0) {
    add("no-company-website", "No company website found", "low",
      "No website/links present in the posting — research the company independently.");
  }
  if (/\b(work from home|remote)\b/.test(lower) && /\b(no experience|anyone can|easy money|quick cash|immediate (?:start|hire))\b/.test(lower)) {
    add("vague-company", "Vague / low-bar posting language", "medium",
      "Generic 'no experience, easy money' language is a common low-quality/scam signal.");
  }

  // Free / personal email domain as the only contact.
  const freeEmail = emails.find((e) =>
    /@(gmail|yahoo|outlook|hotmail|aol|proton(?:mail)?|icloud)\./.test(e),
  );
  if (freeEmail && emails.length > 0) {
    add("personal-email-domain", "Application via personal email domain", "medium",
      `Contact uses a free email provider (${freeEmail.split("@")[1]}) rather than a company domain.`);
  }

  return flags;
}
