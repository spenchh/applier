import { AlertTriangle, ArrowRight, BookmarkPlus, CalendarClock, ClipboardCheck, Inbox, Search, TrendingUp } from "lucide-react";
import Link from "next/link";
import { saveSourcedJobAction } from "@/app/actions";
import { Badge, ButtonLink, EmptyState, PageHeader, Panel, Score } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getAnalytics } from "@/lib/services/analytics";
import { listApplications } from "@/lib/services/application";
import { getRecommendedDiscoveryJobs } from "@/lib/services/discovery";
import { listJobs } from "@/lib/services/job";
import { getPrimaryProfile } from "@/lib/services/profile";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser("/");
  const [profile, jobs, applications, analytics, recommendations] = await Promise.all([getPrimaryProfile(user.id), listJobs(user.id), listApplications(user.id), getAnalytics(user.id), getRecommendedDiscoveryJobs(user.id)]);
  const ready = applications.filter((application) => application.status === "ready for review" || application.status === "approved");
  const recentJobs = jobs.slice(0, 4);

  return (
    <>
      <PageHeader title="Dashboard" eyebrow="InternPilot" action={<ButtonLink href="/jobs">Add job</ButtonLink>} />

      {!profile ? (
        <EmptyState title="Set up your profile" body="Start with verified facts, then import jobs and generate reviewed application packets." action={<ButtonLink href="/onboarding">Begin onboarding</ButtonLink>} />
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Panel>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted)]">Applications</p>
            <TrendingUp className="h-4 w-4 text-emerald-700" aria-hidden />
          </div>
          <p className="mt-3 text-3xl font-semibold">{analytics.total}</p>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted)]">Submitted</p>
            <ClipboardCheck className="h-4 w-4 text-sky-700" aria-hidden />
          </div>
          <p className="mt-3 text-3xl font-semibold">{analytics.submitted}</p>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted)]">Ready</p>
            <Inbox className="h-4 w-4 text-amber-700" aria-hidden />
          </div>
          <p className="mt-3 text-3xl font-semibold">{ready.length}</p>
        </Panel>
        <Panel>
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted)]">Response rate</p>
            <CalendarClock className="h-4 w-4 text-rose-700" aria-hidden />
          </div>
          <p className="mt-3 text-3xl font-semibold">{analytics.responseRate}%</p>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <Panel className="xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Recommended for you</h2>
              <p className="text-sm text-[var(--muted)]">Discovery roles ranked against verified profile facts.</p>
            </div>
            <Link href="/discover" className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
              Explore <Search className="h-4 w-4" aria-hidden />
            </Link>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {recommendations.length ? recommendations.map((job) => (
              <div key={job.id} className="rounded-md border border-[var(--line)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{job.title}</p>
                    <p className="text-sm text-[var(--muted)]">{job.company}</p>
                  </div>
                  <Score value={job.fitScore} />
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-stone-700">{job.rawDescription}</p>
                <form action={saveSourcedJobAction} className="mt-3">
                  <input type="hidden" name="sourcedJobId" value={job.id} />
                  <button type="submit" className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-medium hover:bg-[#f0f0ea]">
                    <BookmarkPlus className="h-4 w-4" aria-hidden />
                    Save
                  </button>
                </form>
              </div>
            )) : (
              <p className="text-sm text-[var(--muted)]">No discovery recommendations yet.</p>
            )}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ready for review</h2>
            <Link href="/applications/review" className="text-sm font-medium text-emerald-700">
              Open queue
            </Link>
          </div>
          <div className="mt-4 grid gap-3">
            {ready.length ? (
              ready.slice(0, 5).map((application) => (
                <Link key={application.id} href={`/applications/${application.id}/tailor`} className="flex items-center justify-between rounded-md border border-[var(--line)] p-3 hover:bg-[#f8f8f2]">
                  <div>
                    <p className="font-medium">{application.jobPosting.title}</p>
                    <p className="text-sm text-[var(--muted)]">{application.jobPosting.company.name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Score value={application.fitScore} />
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">No generated packets are waiting.</p>
            )}
          </div>
        </Panel>

        <Panel>
          <h2 className="text-lg font-semibold">Recently imported jobs</h2>
          <div className="mt-4 grid gap-3">
            {recentJobs.length ? (
              recentJobs.map((job) => (
                <Link key={job.id} href={`/jobs/${job.id}`} className="rounded-md border border-[var(--line)] p-3 hover:bg-[#f8f8f2]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{job.title}</p>
                      <p className="text-sm text-[var(--muted)]">{job.company.name}</p>
                    </div>
                    {job.riskFlagsJson !== "[]" ? (
                      <Badge tone="warn">
                        <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />
                        flags
                      </Badge>
                    ) : (
                      <Badge tone="good">clear</Badge>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-sm text-[var(--muted)]">Import a posting to start tailoring.</p>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}
