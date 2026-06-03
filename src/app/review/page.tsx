import Link from "next/link";
import { ListChecks, ArrowRight, Archive, SkipForward, FileCheck2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, FitScoreBadge } from "@/components/status-badge";
import { RiskCountBadge } from "@/components/risk-flags";
import { ComplianceChecklist } from "@/components/compliance-checklist";
import { listApplications } from "@/lib/services/application-service";
import { setStatusAction } from "@/lib/actions/application-actions";
import { parseJson, parseStringList, formatRelativeDeadline, humanize, cn } from "@/lib/utils";
import type { TruthCheckResult, RiskFlag } from "@/lib/llm/types";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const apps = await listApplications([
    "needs-info",
    "drafted",
    "ready-for-review",
    "approved",
  ]);

  return (
    <div>
      <PageHeader
        title="Application Review Queue"
        description="Review each generated packet one at a time. Approve, edit, skip, or archive. Nothing is submitted until you approve and confirm."
      />

      <div className="mb-6">
        <ComplianceChecklist />
      </div>

      {apps.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Nothing to review"
          description="Tailor a job in the Job Inbox to generate a packet. It will appear here for review."
          actionLabel="Go to Job Inbox"
          actionHref="/jobs"
        />
      ) : (
        <div className="grid gap-3">
          {apps.map((app) => {
            const version = app.resumeVersions[0];
            const truth = parseJson<TruthCheckResult | null>(version?.truthCheckJson ?? null, null);
            const flags = parseJson<RiskFlag[]>(app.jobPosting.riskFlagsJson, []);
            const unsupported = truth?.unsupported.length ?? 0;
            const needsInput = app.answers.filter((a) => a.needsUserInput).length;
            const materials = [
              version ? "Resume" : null,
              app.coverLetters.length ? "Cover letter" : null,
              app.answers.length ? `${app.answers.length} answers` : null,
            ].filter(Boolean) as string[];

            return (
              <Card key={app.id}>
                <CardContent className="p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold">{app.jobPosting.company.name}</h3>
                        <span className="text-sm text-muted-foreground">{app.jobPosting.title}</span>
                        <StatusBadge status={app.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline">{humanize(app.applicationMode)} mode</Badge>
                        <span>{formatRelativeDeadline(app.jobPosting.deadline)}</span>
                        <RiskCountBadge flags={flags} />
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {materials.length ? (
                          materials.map((m) => (
                            <Badge key={m} variant="secondary">
                              {m}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="muted">No materials generated yet</Badge>
                        )}
                      </div>
                      {(unsupported > 0 || needsInput > 0) && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {unsupported > 0 ? <Badge variant="destructive">{unsupported} unsupported</Badge> : null}
                          {needsInput > 0 ? <Badge variant="warning">{needsInput} need input</Badge> : null}
                        </div>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <FitScoreBadge score={app.fitScore} />
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link
                          href={`/applications/${app.id}/tailor`}
                          className={cn(buttonVariants({ size: "sm" }))}
                        >
                          Review &amp; edit <ArrowRight className="size-4" />
                        </Link>
                        {app.approvedAt ? (
                          <Link
                            href={`/applications/${app.id}/submit`}
                            className={cn(buttonVariants({ variant: "success", size: "sm" }))}
                          >
                            <FileCheck2 className="size-4" /> Submit
                          </Link>
                        ) : null}
                        <StatusForm applicationId={app.id} status="archived" label="Archive" icon="archive" />
                        <StatusForm applicationId={app.id} status="saved" label="Skip" icon="skip" />
                      </div>
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

function StatusForm({
  applicationId,
  status,
  label,
  icon,
}: {
  applicationId: string;
  status: string;
  label: string;
  icon: "archive" | "skip";
}) {
  return (
    <form action={setStatusAction}>
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" variant="ghost" size="sm">
        {icon === "archive" ? <Archive className="size-4" /> : <SkipForward className="size-4" />}
        {label}
      </Button>
    </form>
  );
}
