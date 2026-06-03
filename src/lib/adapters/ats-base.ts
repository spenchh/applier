import type { JobPosting, Application } from "@prisma/client";
import { parseJson } from "../utils";
import type { ParsedJob } from "../llm/types";
import type {
  AdapterConfigStatus,
  ApplicationAdapter,
  ApplicationField,
  ImportJobInput,
  ImportedJob,
  SubmissionResult,
  ValidationResult,
} from "./types";

/** Strip HTML tags to readable plain text (for public ATS content fields). */
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/li|\/div|\/h[1-6])\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;|&rsquo;|&apos;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Base for official ATS adapters. Provides the shared contract:
 *  - submission requires explicit configuration (API key); otherwise it returns
 *    a `fallback` result that the service layer turns into Manual Mode.
 *  - submission is only ever reached AFTER user approval (enforced by service).
 */
export abstract class AtsAdapterBase implements ApplicationAdapter {
  abstract provider: string;
  /** Env var names required to actually submit via this provider. */
  protected abstract requiredEnv: string[];

  configStatus(): AdapterConfigStatus {
    const missing = this.requiredEnv.filter((name) => !process.env[name]?.trim());
    return { configured: missing.length === 0, missing };
  }

  abstract canImportJob(url: string): boolean;
  abstract importJob(input: ImportJobInput): Promise<ImportedJob>;

  async getRequiredFields(job: JobPosting): Promise<ApplicationField[]> {
    const parsed = parseJson<ParsedJob | null>(job.parsedJson, null);
    const fields: ApplicationField[] = [
      { name: "first_name", label: "First name", type: "text", required: true },
      { name: "last_name", label: "Last name", type: "text", required: true },
      { name: "email", label: "Email", type: "email", required: true },
      { name: "phone", label: "Phone", type: "text", required: false },
      { name: "resume", label: "Resume", type: "file", required: true },
      { name: "cover_letter", label: "Cover letter", type: "file", required: false },
    ];
    for (const q of parsed?.questions ?? []) {
      fields.push({
        name: q.questionText.toLowerCase().replace(/\W+/g, "_").slice(0, 40),
        label: q.questionText,
        type: q.questionType === "boolean" ? "boolean" : q.questionType === "select" ? "select" : "textarea",
        required: q.required,
        sensitive: q.sensitive,
        options: q.options,
      });
    }
    return fields;
  }

  async validateApplication(_application: Application): Promise<ValidationResult> {
    const status = this.configStatus();
    if (!status.configured) {
      return {
        valid: false,
        missingRequired: status.missing,
        warnings: [
          `${this.provider} submission is not configured (${status.missing.join(", ")}). Will fall back to Manual Mode.`,
        ],
      };
    }
    return { valid: true, missingRequired: [], warnings: [] };
  }

  async submitApplication(_application: Application): Promise<SubmissionResult> {
    const status = this.configStatus();
    if (!status.configured) {
      return {
        status: "fallback",
        message: `${this.provider} is not configured for submission — falling back to Manual Mode.`,
        fallbackTo: "manual",
        requestSummary: { provider: this.provider, configured: false },
      };
    }
    // TODO(ats): implement the actual authenticated submit call for this
    // provider once API credentials and the harvest/ingestion endpoint are
    // configured. Must handle: 429 rate limits, validation errors, required
    // fields, attachments, consent fields, and duplicate-application responses.
    // Submission must remain gated behind explicit per-application approval.
    return {
      status: "pending",
      message: `${this.provider} submission requires final confirmation. (Scaffold — wire up the authenticated API call.)`,
      requestSummary: { provider: this.provider, configured: true },
    };
  }
}
