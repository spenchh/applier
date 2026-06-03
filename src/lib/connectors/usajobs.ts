import { discoveryUserAgent, fetchJson, hasAuthFriendlyLanguage, hasWorkAuthNotRequiredLanguage, inferInternshipTerm, inferWorkplaceType, queryKeyword, stripHtml, withFallbackDescription } from "./external";
import type { DiscoveryQuery, JobConnector, NormalizedSourcedJob } from "./types";

type UsajobsItem = {
  MatchedObjectId?: string;
  MatchedObjectDescriptor?: {
    PositionTitle?: string;
    OrganizationName?: string;
    PositionLocationDisplay?: string;
    PositionURI?: string;
    UserArea?: {
      Details?: {
        JobSummary?: string;
        MajorDuties?: string[];
        Education?: string;
        Evaluations?: string;
      };
    };
    PositionStartDate?: string;
    ApplicationCloseDate?: string;
    PositionRemuneration?: Array<{
      MinimumRange?: string;
      MaximumRange?: string;
      RateIntervalCode?: string;
    }>;
  };
};

type UsajobsResponse = {
  SearchResult?: {
    SearchResultItems?: UsajobsItem[];
  };
};

export class UsajobsConnector implements JobConnector {
  provider = "usajobs";
  label = "USAJOBS";

  status() {
    const configured = Boolean(process.env.USAJOBS_API_KEY && process.env.USAJOBS_USER_AGENT);
    return {
      provider: this.provider,
      label: this.label,
      configured,
      enabled: configured,
      reason: configured ? undefined : "Set USAJOBS_API_KEY and USAJOBS_USER_AGENT to enable federal internship results.",
    };
  }

  async search(query: DiscoveryQuery): Promise<NormalizedSourcedJob[]> {
    const status = this.status();
    if (!status.enabled) return [];

    const url = new URL("https://data.usajobs.gov/api/search");
    url.searchParams.set("Keyword", `${queryKeyword(query)} internship`);
    url.searchParams.set("ResultsPerPage", "20");
    if (query.location) url.searchParams.set("LocationName", query.location);

    const data = await fetchJson<UsajobsResponse>(url, {
      Host: "data.usajobs.gov",
      "User-Agent": discoveryUserAgent(),
      "Authorization-Key": process.env.USAJOBS_API_KEY ?? "",
    });

    return (data.SearchResult?.SearchResultItems ?? []).map((item) => {
      const detail = item.MatchedObjectDescriptor;
      const duties = detail?.UserArea?.Details?.MajorDuties?.join(" ") ?? "";
      const rawDescription = stripHtml([detail?.UserArea?.Details?.JobSummary, duties, detail?.UserArea?.Details?.Education].filter(Boolean).join("\n"));
      const pay = detail?.PositionRemuneration?.[0];
      const text = `${detail?.PositionTitle ?? ""} ${rawDescription}`;
      return withFallbackDescription({
        provider: this.provider,
        externalId: item.MatchedObjectId || detail?.PositionURI || `${detail?.OrganizationName}-${detail?.PositionTitle}`,
        company: detail?.OrganizationName || "Federal agency",
        title: detail?.PositionTitle || "Federal Internship",
        location: detail?.PositionLocationDisplay ?? null,
        workplaceType: inferWorkplaceType(detail?.PositionLocationDisplay, rawDescription),
        internshipTerm: inferInternshipTerm(detail?.PositionTitle, rawDescription),
        sourceUrl: detail?.PositionURI ?? null,
        rawDescription,
        compensationMin: parsePay(pay?.MinimumRange),
        compensationMax: parsePay(pay?.MaximumRange),
        compensationText: pay ? `${pay.MinimumRange ?? "?"}-${pay.MaximumRange ?? "?"} ${pay.RateIntervalCode ?? ""}`.trim() : null,
        visaSponsorshipFriendly: hasAuthFriendlyLanguage(text),
        workAuthNotRequired: hasWorkAuthNotRequiredLanguage(text),
        postedAt: detail?.PositionStartDate ? new Date(detail.PositionStartDate) : null,
        deadline: detail?.ApplicationCloseDate ? new Date(detail.ApplicationCloseDate) : null,
      });
    });
  }
}

function parsePay(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value.replace(/[^0-9.]/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}
