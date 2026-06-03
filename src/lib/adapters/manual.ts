import type { JobPosting, Application } from "@prisma/client";
import { isRestrictedPlatform, detectAtsProvider } from "../url";
import type {
  ApplicationAdapter,
  ApplicationField,
  ImportJobInput,
  ImportedJob,
  SubmissionResult,
  ValidationResult,
} from "./types";

/**
 * ManualAdapter — always available, NEVER submits automatically.
 *
 * It produces a checklist and copyable fields for the user to complete the
 * application themselves on the employer's site. This is the universal fallback
 * and the default mode for every restricted platform.
 */
export class ManualAdapter implements ApplicationAdapter {
  provider = "manual";

  canImportJob(): boolean {
    // Manual import is always "possible" (the user pastes the description), but
    // this adapter does not fetch anything itself.
    return true;
  }

  async importJob(input: ImportJobInput): Promise<ImportedJob> {
    const url = input.url ?? "";
    return {
      imported: Boolean(input.rawText),
      rawText: input.rawText,
      sourceUrl: url,
      atsProvider: url ? detectAtsProvider(url) : "unknown",
      forceManual: true,
      note: url && isRestrictedPlatform(url)
        ? "Restricted platform — Manual Mode only. Open the link and apply there."
        : "Manual Mode: review tailored materials, then apply on the employer's site.",
    };
  }

  async getRequiredFields(_job: JobPosting): Promise<ApplicationField[]> {
    // Manual mode surfaces the common fields the user will copy/paste.
    return [
      { name: "resume", label: "Resume (tailored)", type: "file", required: true },
      { name: "coverLetter", label: "Cover letter", type: "file", required: false },
    ];
  }

  async validateApplication(_application: Application): Promise<ValidationResult> {
    return { valid: true, missingRequired: [], warnings: [] };
  }

  async submitApplication(_application: Application): Promise<SubmissionResult> {
    // By design this never auto-submits. The user submits on the employer site
    // and then marks the application as applied.
    return {
      status: "pending",
      message:
        "Manual Mode does not submit for you. Use the copy buttons and checklist to apply on the employer's site, then mark it submitted.",
      requestSummary: { mode: "manual" },
    };
  }
}
