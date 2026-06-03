import { AtsAdapterBase, htmlToText } from "./ats-base";
import { detectAtsProvider } from "../url";
import type { ImportJobInput, ImportedJob } from "./types";

/**
 * GreenhouseAdapter
 *  - Import: uses the PUBLIC Greenhouse Job Board API (no auth, officially
 *    published) to fetch job content. This is an official API, not scraping.
 *  - Submit: requires GREENHOUSE_API_KEY (Harvest/Job Board ingestion). Falls
 *    back to Manual Mode when not configured.
 */
export class GreenhouseAdapter extends AtsAdapterBase {
  provider = "greenhouse";
  protected requiredEnv = ["GREENHOUSE_API_KEY"];

  canImportJob(url: string): boolean {
    return detectAtsProvider(url) === "greenhouse";
  }

  async importJob(input: ImportJobInput): Promise<ImportedJob> {
    const url = input.url ?? "";
    // Parse board token + job id from common Greenhouse URL shapes.
    const m = url.match(/greenhouse\.io\/(?:embed\/job_app\?for=)?([\w-]+)(?:\/jobs\/)?(\d+)?/i)
      || url.match(/[?&]for=([\w-]+)[\s\S]*?gh_jid=(\d+)/i);
    const jobIdMatch = url.match(/jobs\/(\d+)/) || url.match(/gh_jid=(\d+)/);
    const board = m?.[1];
    const jobId = jobIdMatch?.[1];

    if (!board || !jobId) {
      return {
        imported: false,
        sourceUrl: url,
        atsProvider: "greenhouse",
        forceManual: true,
        note: "Could not derive Greenhouse board/job id from the URL. Paste the job description instead.",
      };
    }

    try {
      const api = `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${jobId}?content=true`;
      const res = await fetch(api, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as {
        title?: string;
        content?: string;
        location?: { name?: string };
        company_name?: string;
      };
      const text = [
        data.company_name ? `Company: ${data.company_name}` : "",
        data.title ? `Role: ${data.title}` : "",
        data.location?.name ? `Location: ${data.location.name}` : "",
        "",
        htmlToText(data.content ?? ""),
      ]
        .filter(Boolean)
        .join("\n");
      return {
        imported: Boolean(text.trim()),
        rawText: text,
        sourceUrl: url,
        atsProvider: "greenhouse",
        note: "Imported via the public Greenhouse Job Board API.",
      };
    } catch (err) {
      // Graceful fallback — never retry aggressively or attempt to defeat
      // protections.
      return {
        imported: false,
        sourceUrl: url,
        atsProvider: "greenhouse",
        forceManual: true,
        note: `Greenhouse public import failed (${(err as Error).message}). Paste the job description instead.`,
      };
    }
  }
}
