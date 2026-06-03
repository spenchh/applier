import { AtsAdapterBase } from "./ats-base";
import { detectAtsProvider } from "../url";
import type { ImportJobInput, ImportedJob } from "./types";

/**
 * LeverAdapter
 *  - Import: uses the PUBLIC Lever postings API (no auth) to fetch posting
 *    content. Official API, not scraping.
 *  - Submit: requires LEVER_API_KEY (Postings API apply endpoint). Falls back to
 *    the hosted apply URL / Manual Mode when custom apply is not configured.
 */
export class LeverAdapter extends AtsAdapterBase {
  provider = "lever";
  protected requiredEnv = ["LEVER_API_KEY"];

  canImportJob(url: string): boolean {
    return detectAtsProvider(url) === "lever";
  }

  async importJob(input: ImportJobInput): Promise<ImportedJob> {
    const url = input.url ?? "";
    const m = url.match(/jobs\.lever\.co\/([\w-]+)\/([\w-]+)/i);
    const site = m?.[1];
    const postingId = m?.[2];

    if (!site || !postingId) {
      return {
        imported: false,
        sourceUrl: url,
        atsProvider: "lever",
        forceManual: true,
        note: "Could not derive Lever site/posting id from the URL. Paste the job description instead.",
      };
    }

    try {
      const api = `https://api.lever.co/v0/postings/${site}/${postingId}?mode=json`;
      const res = await fetch(api, { headers: { accept: "application/json" } });
      if (res.status === 429) {
        return {
          imported: false,
          sourceUrl: url,
          atsProvider: "lever",
          forceManual: true,
          note: "Lever rate-limited the request (429). Try again later or paste the description.",
        };
      }
      if (!res.ok) throw new Error(`status ${res.status}`);
      const data = (await res.json()) as {
        text?: string;
        descriptionPlain?: string;
        categories?: { location?: string; team?: string; commitment?: string };
        lists?: { text?: string; content?: string }[];
        applyUrl?: string;
      };
      const lists = (data.lists ?? [])
        .map((l) => `${l.text ?? ""}\n${(l.content ?? "").replace(/<[^>]+>/g, "")}`)
        .join("\n\n");
      const text = [
        data.text ? `Role: ${data.text}` : "",
        data.categories?.location ? `Location: ${data.categories.location}` : "",
        data.categories?.commitment ? `Commitment: ${data.categories.commitment}` : "",
        "",
        data.descriptionPlain ?? "",
        "",
        lists,
      ]
        .filter(Boolean)
        .join("\n");
      return {
        imported: Boolean(text.trim()),
        rawText: text,
        sourceUrl: data.applyUrl || url,
        atsProvider: "lever",
        note: "Imported via the public Lever Postings API.",
      };
    } catch (err) {
      return {
        imported: false,
        sourceUrl: url,
        atsProvider: "lever",
        forceManual: true,
        note: `Lever public import failed (${(err as Error).message}). Paste the job description instead.`,
      };
    }
  }
}
