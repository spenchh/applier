import { AlertTriangle, Bell, BookmarkPlus, CalendarClock, ExternalLink, Search } from "lucide-react";
import Link from "next/link";
import { saveDiscoverySearchAction, saveSourcedJobAction } from "@/app/actions";
import { Badge, ButtonLink, EmptyState, PageHeader, Panel, Score, inputClass, labelClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { readJson, toList } from "@/lib/json";
import { getDiscoveryPageData, normalizeDiscoveryQuery, type DiscoveryResult } from "@/lib/services/discovery";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DiscoverPage({ searchParams }: PageProps) {
  const user = await requireUser("/discover");
  const params = await searchParams;
  const query = normalizeDiscoveryQuery(params);
  const { jobs, sources, savedSearches, profileReady } = await getDiscoveryPageData(user.id, query);

  return (
    <>
      <PageHeader
        title="Discover"
        eyebrow="Compliant internship search"
        action={<ButtonLink href="/jobs" tone="secondary">Open inbox</ButtonLink>}
      />

      <Panel>
        <form className="grid gap-4 lg:grid-cols-12" action="/discover">
          <label className={`${labelClass} lg:col-span-3`}>
            Keyword
            <input className={inputClass} name="keyword" defaultValue={query.keyword ?? ""} placeholder="computer engineering, research, finance" />
          </label>
          <label className={`${labelClass} lg:col-span-2`}>
            Location
            <input className={inputClass} name="location" defaultValue={query.location ?? ""} placeholder="Chicago, Remote" />
          </label>
          <label className={`${labelClass} lg:col-span-2`}>
            Work mode
            <select className={inputClass} name="workplaceType" defaultValue={query.workplaceType ?? "any"}>
              <option value="any">Any</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </select>
          </label>
          <label className={`${labelClass} lg:col-span-2`}>
            Term
            <select className={inputClass} name="internshipTerm" defaultValue={query.internshipTerm ?? "any"}>
              <option value="any">Any</option>
              <option value="summer">Summer</option>
              <option value="fall">Fall</option>
              <option value="spring">Spring</option>
              <option value="winter">Winter</option>
            </select>
          </label>
          <label className={`${labelClass} lg:col-span-2`}>
            Source
            <select className={inputClass} name="source" defaultValue={query.source ?? "any"}>
              <option value="any">Any</option>
              {sources.map((source) => (
                <option key={source.provider} value={source.provider}>{source.label}</option>
              ))}
            </select>
          </label>
          <div className="flex items-end lg:col-span-1">
            <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#17473a] px-4 py-2 text-sm font-medium text-white hover:bg-[#11352c]">
              <Search className="h-4 w-4" aria-hidden />
              Search
            </button>
          </div>

          <label className={`${labelClass} lg:col-span-2`}>
            Posted
            <select className={inputClass} name="postedWithinDays" defaultValue={query.postedWithinDays ?? ""}>
              <option value="">Any time</option>
              <option value="7">Last 7 days</option>
              <option value="14">Last 14 days</option>
              <option value="30">Last 30 days</option>
            </select>
          </label>
          <label className={`${labelClass} lg:col-span-2`}>
            Deadline
            <select className={inputClass} name="deadlineWithinDays" defaultValue={query.deadlineWithinDays ?? ""}>
              <option value="">Any deadline</option>
              <option value="7">Next 7 days</option>
              <option value="14">Next 14 days</option>
              <option value="30">Next 30 days</option>
            </select>
          </label>
          <label className={`${labelClass} lg:col-span-2`}>
            Company
            <input className={inputClass} name="company" defaultValue={query.company ?? ""} placeholder="Company name" />
          </label>
          <label className={`${labelClass} lg:col-span-2`}>
            Min pay
            <input className={inputClass} name="minCompensation" type="number" min="0" defaultValue={query.minCompensation ?? ""} placeholder="20" />
          </label>
          <label className={`${labelClass} lg:col-span-2`}>
            Max pay
            <input className={inputClass} name="maxCompensation" type="number" min="0" defaultValue={query.maxCompensation ?? ""} placeholder="40" />
          </label>
          <div className="flex flex-col justify-end gap-2 text-sm lg:col-span-2">
            <label className="flex items-center gap-2">
              <input name="visaSponsorshipFriendly" type="checkbox" defaultChecked={Boolean(query.visaSponsorshipFriendly)} />
              Sponsorship-friendly
            </label>
            <label className="flex items-center gap-2">
              <input name="workAuthNotRequired" type="checkbox" defaultChecked={Boolean(query.workAuthNotRequired)} />
              Work auth not required
            </label>
          </div>
        </form>
      </Panel>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="grid gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{jobs.length} discovered roles</h2>
              <p className="text-sm text-[var(--muted)]">Ranked by your Truth Vault fit. Saving uses the existing dedupe and review workflow.</p>
            </div>
            <form action={saveDiscoverySearchAction} className="flex flex-col gap-2 sm:flex-row">
              <HiddenQueryFields query={query} />
              <input name="searchName" className={inputClass} placeholder="Search name" defaultValue={query.keyword ? `${query.keyword} internships` : "Internship search"} />
              <select name="alertCadence" className={inputClass} defaultValue="none">
                <option value="none">No alert</option>
                <option value="daily">Daily alert</option>
                <option value="weekly">Weekly alert</option>
              </select>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium hover:bg-[#f0f0ea]">
                <Bell className="h-4 w-4" aria-hidden />
                Save
              </button>
            </form>
          </div>

          {!profileReady ? (
            <EmptyState title="Finish your profile for better ranking" body="Discover can show jobs now, but fit scores become more useful after you add verified profile facts." action={<ButtonLink href="/onboarding">Complete onboarding</ButtonLink>} />
          ) : null}

          {jobs.length ? jobs.map((job) => <DiscoveryCard key={job.id} job={job} />) : (
            <EmptyState title="No roles match those filters" body="Try a broader keyword or location. Mock discovery always stays available, and configured live sources will refresh when enabled." />
          )}
        </section>

        <aside className="grid content-start gap-4">
          <Panel>
            <h2 className="text-lg font-semibold">Sources</h2>
            <div className="mt-4 grid gap-3">
              {sources.map((source) => {
                const config = readJson<{ configured?: boolean; reason?: string | null }>(source.configJson, {});
                return (
                  <div key={source.id} className="rounded-md border border-[var(--line)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{source.label}</p>
                      <Badge tone={source.enabled ? "good" : "neutral"}>{source.enabled ? "enabled" : "off"}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-[var(--muted)]">{source.lastSyncedAt ? `Last sync ${source.lastSyncedAt.toLocaleDateString()}` : config.reason || "Ready to sync."}</p>
                    {source.lastError ? <p className="mt-2 text-xs text-amber-700">{source.lastError}</p> : null}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-lg font-semibold">Saved searches</h2>
            <div className="mt-4 grid gap-2">
              {savedSearches.length ? savedSearches.map((search) => (
                <div key={search.id} className="rounded-md border border-[var(--line)] p-3 text-sm">
                  <p className="font-medium">{search.name}</p>
                  <p className="text-[var(--muted)]">{search.alertCadence === "none" ? "No alert" : `${search.alertCadence} alert`}</p>
                </div>
              )) : <p className="text-sm text-[var(--muted)]">Save filters to reuse them later. Alert notifications arrive in a later reminder slice.</p>}
            </div>
          </Panel>
        </aside>
      </div>
    </>
  );
}

function DiscoveryCard({ job }: { job: DiscoveryResult }) {
  const risks = toList(job.riskFlagsJson);
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{job.source.label}</Badge>
            {job.workplaceType ? <Badge>{job.workplaceType}</Badge> : null}
            {job.internshipTerm ? <Badge>{job.internshipTerm}</Badge> : null}
            {job.compensationText ? <Badge tone="good">{job.compensationText}</Badge> : null}
            {risks.length ? <Badge tone="warn"><AlertTriangle className="mr-1 h-3 w-3" aria-hidden />{risks.length} flags</Badge> : <Badge tone="good">no obvious flags</Badge>}
          </div>
          <h3 className="mt-3 text-xl font-semibold">{job.title}</h3>
          <p className="mt-1 text-sm text-[var(--muted)]">{job.company}{job.location ? ` - ${job.location}` : ""}</p>
          <p className="mt-3 line-clamp-3 text-sm text-stone-700">{job.rawDescription}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {toList(job.keywords).slice(0, 7).map((keyword) => <Badge key={keyword}>{keyword}</Badge>)}
          </div>
          {job.missingKeywords.length ? <p className="mt-3 text-xs text-amber-800">Missing evidence to strengthen: {job.missingKeywords.join(", ")}</p> : null}
        </div>
        <div className="grid min-w-48 gap-3">
          <div className="rounded-md border border-[var(--line)] p-3">
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--muted)]">Fit</p>
            <div className="mt-2"><Score value={job.fitScore} /></div>
            <p className="mt-2 text-xs text-[var(--muted)]">{job.fitSummary}</p>
          </div>
          <form action={saveSourcedJobAction}>
            <input type="hidden" name="sourcedJobId" value={job.id} />
            <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#17473a] px-4 py-2 text-sm font-medium text-white hover:bg-[#11352c]">
              <BookmarkPlus className="h-4 w-4" aria-hidden />
              Save to inbox
            </button>
          </form>
          <div className="flex gap-3 text-sm">
            {job.sourceUrl ? (
              <Link className="inline-flex items-center gap-1 font-medium text-emerald-700" href={job.sourceUrl} target="_blank">
                Source <ExternalLink className="h-3 w-3" aria-hidden />
              </Link>
            ) : null}
            {job.deadline ? (
              <span className="inline-flex items-center gap-1 text-[var(--muted)]">
                <CalendarClock className="h-3 w-3" aria-hidden />
                {job.deadline.toLocaleDateString()}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}

function HiddenQueryFields({ query }: { query: ReturnType<typeof normalizeDiscoveryQuery> }) {
  return (
    <>
      {Object.entries(query).map(([key, value]) => {
        if (value === undefined || value === false) return null;
        return <input key={key} type="hidden" name={key} value={String(value)} />;
      })}
    </>
  );
}
