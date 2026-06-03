import Link from "next/link";
import {
  Inbox,
  CalendarClock,
  Bell,
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, FitScoreBadge } from "@/components/status-badge";
import { getDashboardData, getAnalytics } from "@/lib/services/analytics-service";
import { getOrCreateProfile } from "@/lib/services/profile-service";
import { formatRelativeDeadline, formatDate, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-2xl font-semibold">{value}</div>
        {hint ? <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const [data, analytics, profile] = await Promise.all([
    getDashboardData(),
    getAnalytics(),
    getOrCreateProfile(),
  ]);

  const onboardingNeeded = !profile.legalName || !profile.email;

  return (
    <div>
      <PageHeader
        title={`Welcome${profile.preferredName ? `, ${profile.preferredName}` : ""}`}
        description="Your internship application command center. Import, analyze, tailor, review, and track — with you in control of every submission."
      >
        <Link href="/jobs/new" className={buttonVariants()}>
          <Inbox className="size-4" /> Add a job
        </Link>
      </PageHeader>

      {onboardingNeeded ? (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardContent className="flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 size-5 text-primary" />
              <div>
                <div className="font-medium">Finish your setup</div>
                <p className="text-sm text-muted-foreground">
                  Add your profile and a few Truth Vault facts so InternPilot can tailor materials truthfully.
                </p>
              </div>
            </div>
            <Link href="/onboarding" className={cn(buttonVariants(), "shrink-0")}>
              Start onboarding <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {/* Funnel */}
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total applications" value={analytics.funnel.total} />
        <Stat label="Ready to review" value={data.readyToReview.length} hint="Awaiting your approval" />
        <Stat label="Submitted" value={analytics.funnel.submitted} />
        <Stat label="Active pipeline" value={data.activeCount} hint="Assessments, interviews, offers" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Ready to review */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-4 text-primary" /> Ready to review
            </CardTitle>
            <CardDescription>Generated packets awaiting your approval.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.readyToReview.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing queued. Tailor a job to generate an application packet.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.readyToReview.slice(0, 5).map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/applications/${a.id}/tailor`}
                      className="flex items-center justify-between rounded-md border p-3 hover:bg-accent"
                    >
                      <div>
                        <div className="text-sm font-medium">{a.jobPosting.company.name}</div>
                        <div className="text-xs text-muted-foreground">{a.jobPosting.title}</div>
                      </div>
                      <FitScoreBadge score={a.fitScore} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Upcoming deadlines */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" /> Upcoming deadlines
            </CardTitle>
            <CardDescription>Don&apos;t miss a window.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.upcomingDeadlines.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming deadlines on tracked jobs.</p>
            ) : (
              <ul className="space-y-2">
                {data.upcomingDeadlines.map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="text-sm font-medium">{a.jobPosting.company.name}</div>
                      <div className="text-xs text-muted-foreground">{a.jobPosting.title}</div>
                    </div>
                    <Badge variant="warning">{formatRelativeDeadline(a.jobPosting.deadline)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="size-4 text-primary" /> Follow-up reminders
            </CardTitle>
            <CardDescription>Open tasks across your applications.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open follow-ups.</p>
            ) : (
              <ul className="space-y-2">
                {data.followUps.map((t) => (
                  <li key={t.id} className="flex items-center justify-between rounded-md border p-3">
                    <div>
                      <div className="text-sm font-medium">{t.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.application.jobPosting.company.name} · due {formatDate(t.dueDate)}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recently imported */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="size-4 text-primary" /> Recently imported jobs
            </CardTitle>
            <CardDescription>Newest postings in your inbox.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.recentJobs.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No jobs yet"
                description="Paste a job description or URL to get started."
                actionLabel="Add a job"
                actionHref="/jobs/new"
              />
            ) : (
              <ul className="space-y-2">
                {data.recentJobs.map((j) => (
                  <li key={j.id}>
                    <Link
                      href={`/jobs/${j.id}`}
                      className="flex items-center justify-between rounded-md border p-3 hover:bg-accent"
                    >
                      <div>
                        <div className="text-sm font-medium">{j.company.name}</div>
                        <div className="text-xs text-muted-foreground">{j.title}</div>
                      </div>
                      {j.applications.length ? (
                        <StatusBadge status={j.applications[0].status} />
                      ) : (
                        <Badge variant="muted">New</Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Response-rate analytics teaser */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="size-4 text-primary" /> Response-rate snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Response rate" value={`${analytics.responseRate}%`} />
          <Stat label="Interview rate" value={`${analytics.interviewRate}%`} />
          <Stat label="Offer rate" value={`${analytics.offerRate}%`} />
          <Stat label="Draft → submit" value={`${analytics.draftToSubmitRate}%`} />
        </CardContent>
      </Card>
    </div>
  );
}
