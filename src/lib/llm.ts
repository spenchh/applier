import { parsedJobSchema, type KeywordCoverage, type ParsedJob, type TruthCheck } from "./schemas";
import { detectRiskFlags, extractKeywords, extractTechnologies, inferRoleCategory, isSensitiveQuestion, splitInterestingLines, unique } from "./text";

export type FactLike = {
  id: string;
  title: string;
  type: string;
  description: string;
  impact?: string | null;
  skills: string;
  resumeAllowed: boolean;
  coverLetterAllowed: boolean;
  answersAllowed: boolean;
};

export function parseJobPostingMock(input: {
  rawDescription: string;
  sourceUrl?: string | null;
  company?: string | null;
  title?: string | null;
  roleCategory?: string | null;
  location?: string | null;
}): ParsedJob {
  const text = input.rawDescription;
  const analysisText = [input.title, input.company, input.roleCategory, text].filter(Boolean).join("\n");
  const lines = splitInterestingLines(text);
  const technologies = extractTechnologies(analysisText);
  const keywords = extractKeywords(analysisText);
  const questions = lines
    .filter((line) => /\?$/.test(line) || /question|answer|tell us|why/i.test(line))
    .map((line) => ({
      questionText: line.replace(/^question:\s*/i, ""),
      questionType: "text",
      required: /required/i.test(line),
      sensitive: isSensitiveQuestion(line),
    }));

  if (/authorized|sponsor|visa/i.test(text)) {
    questions.push({
      questionText: "Are you legally authorized to work in the location of this internship?",
      questionType: "eligibility",
      required: true,
      sensitive: true,
    });
  }

  const parsed = {
    company: input.company || inferCompany(text) || "Unknown Company",
    title: input.title || inferTitle(text) || "Internship Role",
    roleCategory: input.roleCategory || inferRoleCategory(input.title || inferTitle(text) || "", text),
    location: input.location || inferLocation(text),
    workplaceType: /remote/i.test(text) ? "remote" : /hybrid/i.test(text) ? "hybrid" : /onsite|on-site/i.test(text) ? "onsite" : undefined,
    internshipTerm: /summer/i.test(text) ? "summer" : /fall/i.test(text) ? "fall" : /spring/i.test(text) ? "spring" : undefined,
    responsibilities: lines.filter((line) => /build|analyze|collaborate|develop|design|test|support|create|research|write|present|model|coordinate|communicate|manage|plan|evaluate/i.test(line)).slice(0, 5),
    requiredQualifications: lines.filter((line) => /required|must|minimum|currently|degree|experience|proficiency/i.test(line)).slice(0, 6),
    preferredQualifications: lines.filter((line) => /preferred|nice|plus|bonus|familiar/i.test(line)).slice(0, 6),
    technologies,
    keywords,
    applicationQuestions: questions.length
      ? questions
      : [
          {
            questionText: "Why are you interested in this role?",
            questionType: "text",
            required: true,
            sensitive: false,
          },
        ],
    riskFlags: detectRiskFlags(text, input.sourceUrl),
  };

  return parsedJobSchema.parse(parsed);
}

export function parseResumeMock(rawText: string) {
  const lines = splitInterestingLines(rawText);
  return {
    sections: {
      summary: lines[0] ?? "",
      bullets: lines.slice(1),
      skills: extractTechnologies(rawText),
    },
  };
}

export function generateTailoredResumeText(input: {
  profileName: string;
  email: string;
  location?: string | null;
  jobTitle: string;
  company: string;
  facts: FactLike[];
  keywords: string[];
}): { text: string; supportingFactIds: string[]; keywordCoverage: KeywordCoverage; truthCheck: TruthCheck } {
  const allowedFacts = input.facts.filter((fact) => fact.resumeAllowed);
  const factLines = allowedFacts.slice(0, 5).map((fact) => {
    const impact = fact.impact ? ` ${fact.impact}` : "";
    return `- ${fact.title}: ${fact.description}${impact}`;
  });
  const supportingFactIds = allowedFacts.slice(0, 5).map((fact) => fact.id);
  const factSkills = unique(allowedFacts.flatMap((fact) => safeSkillList(fact.skills)));
  const material = `${factLines.join(" ")} ${factSkills.join(" ")}`.toLowerCase();
  const present = input.keywords.filter((keyword) => material.includes(keyword.toLowerCase()));
  const missing = input.keywords.filter((keyword) => !present.includes(keyword));

  const text = [
    input.profileName,
    [input.email, input.location].filter(Boolean).join(" | "),
    "",
    "SUMMARY",
    `Student candidate targeting ${input.jobTitle} at ${input.company}, emphasizing verified experience, projects, coursework, and leadership that match the role.`,
    "",
    "RELEVANT EXPERIENCE AND PROJECTS",
    ...factLines,
    "",
    "SKILLS",
    factSkills.join(", ") || "Add verified skills in the Truth Vault before submitting.",
  ].join("\n");

  return {
    text,
    supportingFactIds,
    keywordCoverage: {
      requiredPresent: present,
      preferredPresent: [],
      missingKeywords: missing,
      intentionallyOmitted: missing.map((keyword) => `${keyword} omitted because no stored fact currently supports it.`),
    },
    truthCheck: {
      supportedClaims: factLines,
      weakClaims: missing.length ? [`Some job keywords need stronger supporting facts: ${missing.join(", ")}`] : [],
      unsupportedClaims: [],
      recommendedEdits: missing.map((keyword) => `Add a verified fact before claiming ${keyword}.`),
    },
  };
}

export function generateCoverLetterMock(input: {
  preferredName: string;
  company: string;
  role: string;
  facts: FactLike[];
}): { text: string; supportingFactIds: string[] } {
  const facts = input.facts.filter((fact) => fact.coverLetterAllowed).slice(0, 2);
  const evidence = facts.map((fact) => `${fact.title}: ${fact.description}`).join(" ");
  return {
    text: `Dear ${input.company} recruiting team,\n\nI am interested in the ${input.role} internship because it aligns with the verified work I have been building through coursework, projects, leadership, and early professional experience. ${evidence}\n\nI would welcome the chance to contribute carefully, learn quickly, and bring a grounded, honest perspective to your team.\n\nSincerely,\n${input.preferredName}`,
    supportingFactIds: facts.map((fact) => fact.id),
  };
}

export function generatePortfolioPlanMock(input: {
  company: string;
  role: string;
  facts: FactLike[];
  keywords: string[];
}): { headline: string; projects: string[]; proofPoints: string[]; gaps: string[] } {
  const allowedFacts = input.facts.filter((fact) => fact.resumeAllowed || fact.coverLetterAllowed);
  const projects = allowedFacts.slice(0, 3).map((fact) => `${fact.title}: feature this as proof of ${safeSkillList(fact.skills).slice(0, 3).join(", ") || fact.type}.`);
  const factText = allowedFacts.map((fact) => `${fact.title} ${fact.description} ${fact.impact ?? ""} ${safeSkillList(fact.skills).join(" ")}`).join(" ").toLowerCase();
  const gaps = input.keywords.filter((keyword) => !factText.includes(keyword.toLowerCase())).slice(0, 5);
  return {
    headline: `Position your portfolio around ${input.company}'s ${input.role} requirements: show relevant proof first, then supporting work.`,
    projects: projects.length ? projects : ["Add verified projects or work samples in the Truth Vault before linking a portfolio."],
    proofPoints: allowedFacts
      .slice(0, 4)
      .map((fact) => `${fact.title}${fact.impact ? ` - ${fact.impact}` : ""}`)
      .filter(Boolean),
    gaps: gaps.length ? gaps.map((keyword) => `Add a project, writing sample, or fact that supports ${keyword}.`) : ["No major portfolio gaps were detected from stored facts."],
  };
}

export function generateAnswerMock(question: string, facts: FactLike[]): {
  answerText: string;
  supportingFactIds: string[];
  truthCheckStatus: "supported" | "needs_user_input" | "sensitive_requires_confirmation";
} {
  if (isSensitiveQuestion(question)) {
    return {
      answerText: "Needs your direct confirmation before this answer is completed.",
      supportingFactIds: [],
      truthCheckStatus: "sensitive_requires_confirmation",
    };
  }

  const lower = question.toLowerCase();
  const usable = facts.filter((fact) => fact.answersAllowed);
  const best =
    usable.find((fact) => lower.includes("project") && fact.type === "project") ??
    usable.find((fact) => lower.includes("lead") && /leadership|club/i.test(fact.type)) ??
    usable[0];

  if (!best) {
    return {
      answerText: "Needs your input: add a supporting fact in the Truth Vault before submitting this answer.",
      supportingFactIds: [],
      truthCheckStatus: "needs_user_input",
    };
  }

  return {
    answerText: `A relevant example is ${best.title}. ${best.description}${best.impact ? ` ${best.impact}` : ""}`,
    supportingFactIds: [best.id],
    truthCheckStatus: "supported",
  };
}

export function truthCheckMaterial(text: string, facts: FactLike[]): TruthCheck {
  const factText = facts.map((fact) => `${fact.title} ${fact.description} ${fact.impact ?? ""} ${safeSkillList(fact.skills).join(" ")}`).join(" ").toLowerCase();
  const suspicious = extractTechnologies(text).filter((term) => !factText.includes(term.toLowerCase()));
  return {
    supportedClaims: facts.filter((fact) => text.toLowerCase().includes(fact.title.toLowerCase())).map((fact) => fact.title),
    weakClaims: suspicious.map((term) => `The term "${term}" appears in generated text without a direct supporting fact.`),
    unsupportedClaims: [],
    recommendedEdits: suspicious.map((term) => `Remove ${term} or add a verified fact supporting it.`),
  };
}

function inferCompany(text: string): string | undefined {
  const match = text.match(/(?:company|at)\s*:?\s*([A-Z][A-Za-z0-9 &.-]{2,40})/);
  return match?.[1]?.trim();
}

function inferTitle(text: string): string | undefined {
  const match = text.match(/([A-Z][A-Za-z ]+(?:Intern|Internship|Co-op))/);
  return match?.[1]?.trim();
}

function inferLocation(text: string): string | undefined {
  const match = text.match(/(?:location|based in)\s*:?\s*([A-Za-z ,.-]{2,60})/i);
  return match?.[1]?.trim();
}

function safeSkillList(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}
