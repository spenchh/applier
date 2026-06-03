import { AtsAdapterBase } from "./ats-base";
import { detectAtsProvider } from "../url";
import type { ImportJobInput, ImportedJob } from "./types";

/**
 * SmartRecruitersAdapter
 *  - Import: SmartRecruiters has a public Posting API
 *    (https://api.smartrecruiters.com/v1/companies/{companyId}/postings/{id}),
 *    including screening questions. Deriving companyId/postingId from arbitrary
 *    URLs is org-specific, so the MVP scaffolds it and falls back to Manual.
 *  - Submit: requires SMARTRECRUITERS_API_KEY and permitted configuration.
 *    Falls back to Manual Mode otherwise.
 */
export class SmartRecruitersAdapter extends AtsAdapterBase {
  provider = "smartrecruiters";
  protected requiredEnv = ["SMARTRECRUITERS_API_KEY"];

  canImportJob(url: string): boolean {
    return detectAtsProvider(url) === "smartrecruiters";
  }

  async importJob(input: ImportJobInput): Promise<ImportedJob> {
    const url = input.url ?? "";
    // TODO(smartrecruiters): call the public Posting API to fetch posting info
    // and screening questions once company/posting id mapping is configured.
    return {
      imported: false,
      sourceUrl: url,
      atsProvider: "smartrecruiters",
      forceManual: true,
      note: "SmartRecruiters public import is scaffolded. Paste the job description to analyze it (Manual Mode).",
    };
  }
}
