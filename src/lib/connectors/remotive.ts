import { fetchJson, hasAuthFriendlyLanguage, hasWorkAuthNotRequiredLanguage, inferInternshipTerm, stripHtml, withFallbackDescription } from "./external";
import type { DiscoveryQuery, JobConnector, NormalizedSourcedJob } from "./types";

type RemotiveJob = {
  id?: number;
  url?: string;
  title?: string;
  company_name?: string;
  candidate_required_location?: string;
  description?: string;
  publication_date?: string;
  salary?: string;
};

type RemotiveResponse = {
  jobs?: RemotiveJob[];
};

export class RemotiveConnector implements JobConnector {
  provider = "remotive";
  label = "Remotive";

  status() {
    const enabled = process.env.REMOTIVE_ENABLED === "true";
    return {
      provider: this.provider,
      label: this.label,
      configured: enabled,
      enabled,
      reason: enabled ? undefined : "Set REMOTIVE_ENABLED=true to opt into public Remotive remote-job results.",
    };
  }

  async search(query: DiscoveryQuery): Promise<NormalizedSourcedJob[]> {
    const status = this.status();
    if (!status.enabled) return [];

    const url = new URL("https://remotive.com/api/remote-jobs");
    url.searchParams.set("search", `${query.keyword?.trim() || "intern"} internship`);

    const data = await fetchJson<RemotiveResponse>(url);
    return (data.jobs ?? []).slice(0, 20).map((job) => {
      const rawDescription = stripHtml(job.description);
      const text = `${job.title ?? ""} ${rawDescription}`;
      return withFallbackDescription({
        provider: this.provider,
        externalId: String(job.id ?? job.url ?? `${job.company_name}-${job.title}`),
        company: job.company_name || "Remote company",
        title: job.title || "Remote Internship",
        location: job.candidate_required_location || "Remote",
        workplaceType: "remote",
        internshipTerm: inferInternshipTerm(job.title, rawDescription),
        sourceUrl: job.url ?? null,
        rawDescription,
        compensationText: job.salary || null,
        visaSponsorshipFriendly: hasAuthFriendlyLanguage(text),
        workAuthNotRequired: hasWorkAuthNotRequiredLanguage(text),
        postedAt: job.publication_date ? new Date(job.publication_date) : null,
      });
    });
  }
}
