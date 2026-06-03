import Link from "next/link";
import { Inbox, Plus, MapPin, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, FitScoreBadge } from "@/components/status-badge";
import { RiskCountBadge } from "@/components/risk-flags";
import { db } from "@/lib/db";
import { parseJson, parseStringList, humanize, formatRelativeDeadline, truncate, cn } from "@/lib/utils";
import { isRestrictedPlatform } from "@/lib/url";
import type { RiskFlag } from "@/lib/llm/types";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const jobs = await db.jobPosting.findMany({
    include: { company: true, applications: true },
    orderBy: { importedAt: "desc" },
  });

  return (
    <div>
      <PageHeader
        title="Job Inbox"
        description="Imported postings with parsed details, fit, and risk indicators. Deduplicated by company, title, location, and description."
      >
        <Link href="/jobs/new" className={buttonVariants()}>
          <Plus className="size-4" /> Add a job
        </Link>
      </PageHeader>

      {jobs.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="Your inbox is empty"
          description="Paste a job description or import from a public ATS URL to analyze fit and tailor your materials."
          actionLabel="Add your first job"
          actionHref="/jobs/new"
        />
      ) : (
        <div className="grid gap-3">
          {jobs.map((job) => {
            const flags = parseJson<RiskFlag[]>(job.riskFlagsJson, []);
            const tech = parseStringList(job.technologies).slice(0, 6);
            const app = job.applications[0];
            const restricted = job.sourceUrl ? isRestrictedPlatform(job.sourceUrl) : false;
            return (
              <Card key={job.id} className="transition-colors hover:border-primary/40">
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <Link href={`/jobs/${job.id}`} className="block">
                        <h3 className="truncate text-base font-semibold hover:underline">
                          {job.title} · <span className="text-muted-foreground">{job.company.name}</span>
                        </h3>
                      </Link>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {job.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="size-3" /> {job.location}
                          </span>
                        ) : null}
                        {job.workplaceType ? <Badge variant="outline">{humanize(job.workplaceType)}</Badge> : null}
                        {job.internshipTerm ? <span>{job.internshipTerm}</span> : null}
                        {job.atsProvider && job.atsProvider !== "unknown" ? (
                          <Badge variant="muted">{humanize(job.atsProvider)}</Badge>
                        ) : null}
                        {restricted ? <Badge variant="warning">Manual-only platform</Badge> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <RiskCountBadge flags={flags} />
                      {app ? <StatusBadge status={app.status} /> : <Badge variant="muted">Not started</Badge>}
                      {app ? <FitScoreBadge score={app.fitScore} /> : null}
                    </div>
                  </div>

                  {job.rawDescription ? (
                    <p className="mt-2 text-sm text-muted-foreground">{truncate(job.rawDescription, 180)}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1.5">
                      {tech.map((t) => (
                        <Badge key={t} variant="secondary">
                          {t}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {job.deadline ? <span>{formatRelativeDeadline(job.deadline)}</span> : null}
                      {job.sourceUrl ? (
                        <a
                          href={job.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          <ExternalLink className="size-3" /> Source
                        </a>
                      ) : null}
                      <Link href={`/jobs/${job.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                        View &amp; tailor
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
