import type { JobPosting, Application } from "@prisma/client";
import { env } from "../env";
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

/**
 * EmailAdapter — for postings that explicitly list an application email.
 *
 * Generates a draft email with the tailored resume and cover letter attached.
 * It SENDS only when an email provider is configured (RESEND_API_KEY +
 * EMAIL_FROM) and the user confirms. Otherwise it exports a `.eml` draft.
 *
 * Mass/un-confirmed sending is never performed; each send is a single,
 * user-approved action gated by the service layer.
 */
export class EmailAdapter implements ApplicationAdapter {
  provider = "email";

  static configStatus(): AdapterConfigStatus {
    const missing: string[] = [];
    if (!env.resendApiKey) missing.push("RESEND_API_KEY");
    if (!env.emailFrom) missing.push("EMAIL_FROM");
    return { configured: missing.length === 0, missing };
  }

  static applicationEmailFor(job: JobPosting): string | null {
    const parsed = parseJson<ParsedJob | null>(job.parsedJson, null);
    return parsed?.applicationEmail || null;
  }

  canImportJob(): boolean {
    return false; // email adapter does not import jobs
  }

  async importJob(_input: ImportJobInput): Promise<ImportedJob> {
    return { imported: false, note: "Email adapter does not import jobs." };
  }

  async getRequiredFields(job: JobPosting): Promise<ApplicationField[]> {
    const to = EmailAdapter.applicationEmailFor(job) ?? "";
    return [
      { name: "to", label: "Application email", type: "email", required: true, value: to },
      { name: "subject", label: "Subject", type: "text", required: true },
      { name: "body", label: "Email body (cover letter)", type: "textarea", required: true },
      { name: "resume", label: "Resume attachment", type: "file", required: true },
    ];
  }

  async validateApplication(_application: Application): Promise<ValidationResult> {
    const status = EmailAdapter.configStatus();
    return {
      valid: true, // always valid — falls back to export when unconfigured
      missingRequired: [],
      warnings: status.configured
        ? []
        : [`Email sending not configured (${status.missing.join(", ")}). A .eml draft will be exported instead.`],
    };
  }

  async submitApplication(_application: Application): Promise<SubmissionResult> {
    const status = EmailAdapter.configStatus();
    if (!status.configured) {
      // TODO(email): when RESEND_API_KEY + EMAIL_FROM are configured, send via
      // Resend here. For now we export a draft (handled by the service layer).
      return {
        status: "exported",
        message: "Email provider not configured — exported an .eml draft for you to send manually.",
        requestSummary: { mode: "email", action: "export-draft" },
        fallbackTo: "email",
      };
    }
    // TODO(email): implement real send via Resend once configured + confirmed.
    return {
      status: "pending",
      message: "Email send requires final user confirmation on the submission screen.",
      requestSummary: { mode: "email", action: "send", configured: true },
    };
  }
}
