import Link from "next/link";
import { KanbanSquare, Table2, Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge, FitScoreBadge } from "@/components/status-badge";
import { StatusSelect } from "@/components/forms/status-select";
import { listApplications } from "@/lib/services/application-service";
import { APPLICATION_STATUSES, STATUS_LABELS, type ApplicationStatus } from "@/lib/constants";
import { formatDate, formatRelativeDeadline, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// Columns shown on the Kanban (a curated, ordered subset for readability).
const KANBAN_COLUMNS: ApplicationStatus[] = [
  "saved",
  "needs-info",
  "ready-for-review",
  "approved",
  "submitted",
  "interview-scheduled",
  "offer",
  "rejected",
];

export default async function TrackerPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const apps = await listApplications();
  const isTable = view === "table";

  const byStatus = new Map<string, typeof apps>();
  for (const a of apps) {
    const list = byStatus.get(a.status) ?? [];
    list.push(a);
    byStatus.set(a.status, list);
  }

  return (
    <div>
      <PageHeader
        title="Tracker"
        description="Every application, deadline, and outcome in one place. Update statuses, add follow-ups, and export to CSV."
      >
        <Link href="/tracker" className={cn(buttonVariants({ variant: isTable ? "outline" : "default", size: "sm" }))}>
          <KanbanSquare className="size-4" /> Kanban
        </Link>
        <Link href="/tracker?view=table" className={cn(buttonVariants({ variant: isTable ? "default" : "outline", size: "sm" }))}>
          <Table2 className="size-4" /> Table
        </Link>
        <a href="/api/applications/export" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          <Download className="size-4" /> Export CSV
        </a>
      </PageHeader>

      {apps.length === 0 ? (
        <EmptyState
          icon={KanbanSquare}
          title="No applications yet"
          description="Once you tailor and track jobs, they'll appear here across the pipeline."
          actionLabel="Add a job"
          actionHref="/jobs/new"
        />
      ) : isTable ? (
        <Card>
          <CardContent className="overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Company / Role</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 font-medium">Fit</th>
                  <th className="px-4 py-2.5 font-medium">Deadline</th>
                  <th className="px-4 py-2.5 font-medium">Applied</th>
                  <th className="px-4 py-2.5 font-medium">Resume</th>
                  <th className="px-4 py-2.5 font-medium">Source</th>
                </tr>
              </thead>
              <tbody>
                {apps.map((a) => (
                  <tr key={a.id} className="border-b last:border-0 hover:bg-accent/40">
                    <td className="px-4 py-2.5">
                      <Link href={`/applications/${a.id}/tailor`} className="font-medium hover:underline">
                        {a.jobPosting.company.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{a.jobPosting.title}</div>
                    </td>
                    <td className="px-4 py-2.5">
                      <StatusSelect applicationId={a.id} status={a.status} />
                    </td>
                    <td className="px-4 py-2.5">
                      <FitScoreBadge score={a.fitScore} />
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                      {formatRelativeDeadline(a.jobPosting.deadline)}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(a.submittedAt)}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{a.resumeVersionLabel ?? "—"}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{a.source ?? a.jobPosting.sourceName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-flow-col auto-cols-[minmax(240px,1fr)] gap-3 overflow-x-auto pb-3">
          {KANBAN_COLUMNS.map((status) => {
            const items = byStatus.get(status) ?? [];
            return (
              <div key={status} className="flex min-w-[240px] flex-col rounded-lg border bg-muted/30">
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-sm font-semibold">{STATUS_LABELS[status]}</span>
                  <Badge variant="muted">{items.length}</Badge>
                </div>
                <div className="flex-1 space-y-2 px-2 pb-2">
                  {items.map((a) => (
                    <Link
                      key={a.id}
                      href={`/applications/${a.id}/tailor`}
                      className="block rounded-md border bg-card p-3 shadow-sm transition-colors hover:border-primary/40"
                    >
                      <div className="text-sm font-medium">{a.jobPosting.company.name}</div>
                      <div className="text-xs text-muted-foreground">{a.jobPosting.title}</div>
                      <div className="mt-2 flex items-center justify-between">
                        <FitScoreBadge score={a.fitScore} />
                        {a.jobPosting.deadline ? (
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeDeadline(a.jobPosting.deadline)}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                  {items.length === 0 ? (
                    <p className="px-1 py-2 text-xs text-muted-foreground">—</p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
