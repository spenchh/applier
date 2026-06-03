import { fetchJson, hasAuthFriendlyLanguage, hasWorkAuthNotRequiredLanguage, inferInternshipTerm, inferWorkplaceType, queryKeyword, stripHtml, withFallbackDescription } from "./external";
import type { DiscoveryQuery, JobConnector, NormalizedSourcedJob } from "./types";

type AdzunaResult = {
  id?: string;
  title?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  description?: string;
  redirect_url?: string;
  created?: string;
  salary_min?: number;
  salary_max?: number;
  category?: { label?: string };
};

type AdzunaResponse = {
  results?: AdzunaResult[];
};

export class AdzunaConnector implements JobConnector {
  provider = "adzuna";
  label = "Adzuna";

  status() {
    const configured = Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY);
    return {
      provider: this.provider,
      label: this.label,
      configured,
      enabled: configured,
      reason: configured ? undefined : "Set ADZUNA_APP_ID and ADZUNA_APP_KEY to enable Adzuna results.",
    };
  }

  async search(query: DiscoveryQuery): Promise<NormalizedSourcedJob[]> {
    const status = this.status();
    if (!status.enabled) return [];

    const country = process.env.ADZUNA_COUNTRY || "us";
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/1`);
    url.searchParams.set("app_id", process.env.ADZUNA_APP_ID ?? "");
    url.searchParams.set("app_key", process.env.ADZUNA_APP_KEY ?? "");
    url.searchParams.set("results_per_page", "20");
    url.searchParams.set("what", `${queryKeyword(query)} internship`);
    if (query.location) url.searchParams.set("where", query.location);
    if (query.minCompensation) url.searchParams.set("salary_min", String(query.minCompensation));
    if (query.maxCompensation) url.searchParams.set("salary_max", String(query.maxCompensation));

    const data = await fetchJson<AdzunaResponse>(url);
    return (data.results ?? []).map((item) => {
      const rawDescription = stripHtml(item.description);
      const text = `${item.title ?? ""} ${rawDescription}`;
      return withFallbackDescription({
        provider: this.provider,
        externalId: item.id || item.redirect_url || `${item.company?.display_name}-${item.title}`,
        company: item.company?.display_name || "Unknown company",
        title: item.title || "Internship",
        location: item.location?.display_name ?? null,
        workplaceType: inferWorkplaceType(item.location?.display_name, rawDescription),
        internshipTerm: inferInternshipTerm(item.title, rawDescription),
        sourceUrl: item.redirect_url ?? null,
        rawDescription,
        compensationMin: item.salary_min ? Math.round(item.salary_min) : null,
        compensationMax: item.salary_max ? Math.round(item.salary_max) : null,
        compensationText: item.salary_min || item.salary_max ? `${item.salary_min ?? "?"}-${item.salary_max ?? "?"}` : null,
        visaSponsorshipFriendly: hasAuthFriendlyLanguage(text),
        workAuthNotRequired: hasWorkAuthNotRequiredLanguage(text),
        postedAt: item.created ? new Date(item.created) : null,
      });
    });
  }
}
