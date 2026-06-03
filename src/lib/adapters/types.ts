import type { JobPosting, Application } from "@prisma/client";

export interface ImportJobInput {
  url?: string;
  rawText?: string;
  sourceName?: string;
}

export interface ImportedJob {
  /** Whether this adapter actually produced job data, or just metadata. */
  imported: boolean;
  rawText?: string;
  sourceUrl?: string;
  atsProvider?: string;
  /** If import was not possible, why — surfaced to the user. */
  note?: string;
  /** Forces Manual Mode (restricted platform / unknown source). */
  forceManual?: boolean;
}

export interface ApplicationField {
  name: string;
  label: string;
  type: "text" | "textarea" | "email" | "file" | "boolean" | "select" | "consent";
  required: boolean;
  sensitive?: boolean;
  options?: string[];
  value?: string;
}

export interface ValidationResult {
  valid: boolean;
  missingRequired: string[];
  warnings: string[];
}

export type SubmissionStatus =
  | "success"
  | "error"
  | "fallback"
  | "duplicate"
  | "rate-limited"
  | "exported"
  | "pending";

export interface SubmissionResult {
  status: SubmissionStatus;
  /** Human-readable outcome shown to the user. */
  message: string;
  /** Sanitized request summary (NEVER full resumes/secrets) for the audit log. */
  requestSummary?: Record<string, unknown>;
  responseSummary?: Record<string, unknown>;
  /** When status is "fallback", the mode to fall back to. */
  fallbackTo?: "manual" | "email";
  errorMessage?: string;
}

export interface ApplicationAdapter {
  provider: string;
  /** Whether this adapter can import job info from the given URL. */
  canImportJob(url: string): boolean;
  importJob(input: ImportJobInput): Promise<ImportedJob>;
  getRequiredFields(job: JobPosting): Promise<ApplicationField[]>;
  validateApplication(application: Application): Promise<ValidationResult>;
  /**
   * Submit. Implementations MUST require explicit configuration (API key) and
   * MUST be called only after user approval (enforced by the service layer).
   * When not configured or fields are missing, return a `fallback` result.
   */
  submitApplication(application: Application): Promise<SubmissionResult>;
}

/** Whether the adapter has the configuration needed to actually submit. */
export interface AdapterConfigStatus {
  configured: boolean;
  missing: string[];
}
