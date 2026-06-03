/**
 * Shared const unions used as lightweight "enums" (SQLite has no enum type).
 * These are validated at the service boundary with Zod.
 */

export const APPLICATION_STATUSES = [
  "saved",
  "needs-info",
  "drafted",
  "ready-for-review",
  "approved",
  "submitted",
  "online-assessment",
  "interview-scheduled",
  "interview-completed",
  "offer",
  "rejected",
  "withdrawn",
  "archived",
] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Statuses that count as "active" pipeline (for funnel/analytics). */
export const ACTIVE_STATUSES: ApplicationStatus[] = [
  "submitted",
  "online-assessment",
  "interview-scheduled",
  "interview-completed",
  "offer",
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  saved: "Saved",
  "needs-info": "Needs info",
  drafted: "Drafted",
  "ready-for-review": "Ready for review",
  approved: "Approved",
  submitted: "Submitted",
  "online-assessment": "Online assessment",
  "interview-scheduled": "Interview scheduled",
  "interview-completed": "Interview completed",
  offer: "Offer",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  archived: "Archived",
};

export const APPLICATION_MODES = ["manual", "adapter", "email"] as const;
export type ApplicationMode = (typeof APPLICATION_MODES)[number];

export const PROFILE_FACT_TYPES = [
  "experience",
  "education",
  "project",
  "award",
  "coursework",
  "skill",
  "certification",
  "club",
  "leadership",
  "publication",
  "hackathon",
  "volunteer",
  "language",
] as const;
export type ProfileFactType = (typeof PROFILE_FACT_TYPES)[number];

export const RESUME_BASE_TYPES = [
  "software-engineering",
  "data-science",
  "product-management",
  "finance",
  "consulting",
  "research",
  "general",
] as const;
export type ResumeBaseType = (typeof RESUME_BASE_TYPES)[number];

export const ATS_PROVIDERS = [
  "greenhouse",
  "lever",
  "ashby",
  "smartrecruiters",
  "unknown",
] as const;
export type AtsProvider = (typeof ATS_PROVIDERS)[number];

export const WORKPLACE_TYPES = ["remote", "hybrid", "onsite"] as const;
export type WorkplaceType = (typeof WORKPLACE_TYPES)[number];

export const TRUTH_CHECK_STATUSES = [
  "supported",
  "weak",
  "unsupported",
  "sensitive",
  "needs-input",
  "unknown",
] as const;
export type TruthCheckStatus = (typeof TRUTH_CHECK_STATUSES)[number];

export const QUESTION_TYPES = [
  "text",
  "textarea",
  "select",
  "multiselect",
  "boolean",
  "file",
  "eligibility",
  "demographic",
] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

/**
 * Restricted platforms: storing/tracking/tailoring/opening URLs is allowed, but
 * scraping, auto-apply, and any automated activity is NOT. URL imports from
 * these hosts are forced into Manual Mode and never auto-fetched.
 */
export const RESTRICTED_PLATFORM_HOSTS = [
  "linkedin.com",
  "indeed.com",
  "handshake.com",
  "joinhandshake.com",
  "simplify.jobs",
  "ripplematch.com",
  "glassdoor.com",
  "ziprecruiter.com",
  "monster.com",
  "wellfound.com",
  "angel.co",
  "dice.com",
] as const;

/** ATS hosts we may attempt official/public job-info import for. */
export const ATS_HOST_PATTERNS: { provider: AtsProvider; pattern: RegExp }[] = [
  { provider: "greenhouse", pattern: /(boards\.)?greenhouse\.io/i },
  { provider: "greenhouse", pattern: /job-boards\.greenhouse\.io/i },
  { provider: "lever", pattern: /jobs\.lever\.co/i },
  { provider: "ashby", pattern: /jobs\.ashbyhq\.com/i },
  { provider: "smartrecruiters", pattern: /(jobs|careers)\.smartrecruiters\.com/i },
];
