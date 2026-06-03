import type { Application, JobPosting } from "@prisma/client";
import { detectAtsProvider, isRestrictedPlatform } from "./text";

export type SubmissionResult = {
  status: "manual_only" | "not_configured" | "submitted" | "failed";
  message: string;
};

export interface ApplicationAdapter {
  provider: string;
  canImportJob(url: string): boolean;
  getRequiredFields(job: JobPosting): Promise<string[]>;
  validateApplication(application: Application): Promise<{ ok: boolean; errors: string[] }>;
  submitApplication(application: Application): Promise<SubmissionResult>;
}

export class ManualAdapter implements ApplicationAdapter {
  provider = "manual";

  canImportJob() {
    return true;
  }

  async getRequiredFields() {
    return ["Resume", "Application answers", "Final user review"];
  }

  async validateApplication(application: Application) {
    return {
      ok: Boolean(application.approvedAt),
      errors: application.approvedAt ? [] : ["Application must be approved before export or submission."],
    };
  }

  async submitApplication() {
    return {
      status: "manual_only",
      message: "Manual Mode never submits automatically. Use the checklist and mark the application submitted after you apply.",
    } satisfies SubmissionResult;
  }
}

class OfficialAdapter implements ApplicationAdapter {
  constructor(public provider: string, private hostNeedle: string, private envKey: string) {}

  canImportJob(url: string) {
    return detectAtsProvider(url) === this.provider || url.includes(this.hostNeedle);
  }

  async getRequiredFields() {
    return ["Resume attachment", "Required application questions", "Consent fields", "Configured official API credentials"];
  }

  async validateApplication(application: Application) {
    const errors = [];
    if (!application.approvedAt) errors.push("Application must be approved before any official adapter call.");
    if (!process.env[this.envKey]) errors.push(`${this.provider} API credentials are not configured.`);
    return { ok: errors.length === 0, errors };
  }

  async submitApplication(application: Application): Promise<SubmissionResult> {
    const validation = await this.validateApplication(application);
    if (!validation.ok) {
      return {
        status: "not_configured",
        message: `Falling back to Manual Mode: ${validation.errors.join(" ")}`,
      };
    }
    return {
      status: "failed",
      message: "Submission endpoint is scaffolded only. Configure and implement the approved ATS integration before use.",
    };
  }
}

export class EmailAdapter extends OfficialAdapter {
  constructor() {
    super("email", "mailto:", "RESEND_API_KEY");
  }
}

export const adapters: ApplicationAdapter[] = [
  new ManualAdapter(),
  new EmailAdapter(),
  new OfficialAdapter("greenhouse", "greenhouse", "GREENHOUSE_API_KEY"),
  new OfficialAdapter("lever", "lever", "LEVER_API_KEY"),
  new OfficialAdapter("ashby", "ashby", "ASHBY_API_KEY"),
  new OfficialAdapter("smartrecruiters", "smartrecruiters", "SMARTRECRUITERS_API_KEY"),
];

export function chooseApplicationMode(sourceUrl?: string | null): string {
  if (isRestrictedPlatform(sourceUrl)) return "manual";
  const provider = detectAtsProvider(sourceUrl);
  return provider ?? "manual";
}

export function adapterFor(mode: string): ApplicationAdapter {
  return adapters.find((adapter) => adapter.provider === mode) ?? adapters[0];
}
