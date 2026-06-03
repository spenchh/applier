import { AtsAdapterBase } from "./ats-base";
import { detectAtsProvider } from "../url";
import type { ImportJobInput, ImportedJob } from "./types";

/**
 * AshbyAdapter
 *  - Import: Ashby exposes a public posting API per job board
 *    (https://api.ashbyhq.com/posting-api/job-board/{board}). Deriving the
 *    board + posting id from an arbitrary jobs.ashbyhq.com URL is org-specific,
 *    so the MVP scaffolds this and falls back to Manual Mode (paste).
 *  - Submit: requires ASHBY_API_KEY. Uses the form specification when available.
 *    Falls back to Manual Mode otherwise.
 */
export class AshbyAdapter extends AtsAdapterBase {
  provider = "ashby";
  protected requiredEnv = ["ASHBY_API_KEY"];

  canImportJob(url: string): boolean {
    return detectAtsProvider(url) === "ashby";
  }

  async importJob(input: ImportJobInput): Promise<ImportedJob> {
    const url = input.url ?? "";
    // TODO(ashby): call https://api.ashbyhq.com/posting-api/job-board/{board}
    // and match the posting id once the board-name mapping is configured. Use
    // the returned form specification to build required fields for submission.
    return {
      imported: false,
      sourceUrl: url,
      atsProvider: "ashby",
      forceManual: true,
      note: "Ashby public import is scaffolded. Paste the job description to analyze it (Manual Mode).",
    };
  }
}
