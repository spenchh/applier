import { BarChart3, TrendingUp, Clock, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { getAnalytics } from "@/lib/services/analytics-service";
import { STATUS_LABELS, type ApplicationStatus } from "@/lib/constants";
import { humanize } from "@/lib/utils";

export const dynamic = "force-dynamic";

function RateCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="mt-1 text-3xl font-semibold">{value}</div>
        {hint ? <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

export default async function AnalyticsPage() {
  const a = await getAnalytics();
  const maxWeek = Math.max(1, ...a.byWeek.map((w) => w.count));
  const hasData = a.funnel.total > 0;

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Understand what's working: response rates, best-performing resume versions, sources, and timing."
      />

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="No data yet"
          description="Apply to a few internships and your funnel, response rates, and trends will appear here."
          actionLabel="Add a job"
          actionHref="/jobs/new"
        />
      ) : (
        <div className="space-y-6">
          {/* Rates */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <RateCard label="Response rate" value={`${a.responseRate}%`} hint="of submitted" />
            <RateCard label="Interview rate" value={`${a.interviewRate}%`} hint="of submitted" />
            <RateCard label="Offer rate" value={`${a.offerRate}%`} hint="of submitted" />
            <RateCard label="Draft → submit" value={`${a.draftToSubmitRate}%`} hint="conversion" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Applications by week */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" /> Applications submitted by week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex h-40 items-end gap-2">
                  {a.byWeek.map((w) => (
                    <div key={w.week} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t bg-primary/70"
                        style={{ height: `${(w.count / maxWeek) * 100}%`, minHeight: w.count ? "4px" : "0" }}
                        title={`${w.count} submitted`}
                      />
                      <span className="text-[10px] text-muted-foreground">{w.week}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Funnel by status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="size-4 text-primary" /> Pipeline by status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(a.byStatus)
                  .sort((x, y) => y[1] - x[1])
                  .map(([status, count]) => (
                    <div key={status} className="flex items-center gap-3">
                      <span className="w-36 shrink-0 text-sm text-muted-foreground">
                        {STATUS_LABELS[status as ApplicationStatus] ?? status}
                      </span>
                      <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                        <div
                          className="h-full rounded bg-primary/60"
                          style={{ width: `${(count / a.funnel.total) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 text-right text-sm font-medium">{count}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>

            {/* Top sources */}
            <Card>
              <CardHeader>
                <CardTitle>Top sources</CardTitle>
                <CardDescription>Where your tracked applications come from.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {a.topSources.map((s) => (
                  <div key={s.source} className="flex items-center justify-between">
                    <span className="text-sm">{humanize(s.source)}</span>
                    <Badge variant="secondary">{s.count}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Resume version performance */}
            <Card>
              <CardHeader>
                <CardTitle>Resume version performance</CardTitle>
                <CardDescription>Responses by base resume used.</CardDescription>
              </CardHeader>
              <CardContent>
                {a.resumeVersionPerformance.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No submitted applications with a resume version yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="text-left text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="pb-1 font-medium">Version</th>
                        <th className="pb-1 font-medium">Submitted</th>
                        <th className="pb-1 font-medium">Responses</th>
                        <th className="pb-1 font-medium">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {a.resumeVersionPerformance.map((v) => (
                        <tr key={v.version} className="border-t">
                          <td className="py-1.5">{humanize(v.version)}</td>
                          <td className="py-1.5">{v.submitted}</td>
                          <td className="py-1.5">{v.responses}</td>
                          <td className="py-1.5">{v.rate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Timing + misses */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <Clock className="size-5 text-primary" />
                <div>
                  <div className="text-sm text-muted-foreground">Avg. time to response</div>
                  <div className="text-xl font-semibold">
                    {a.avgDaysToResponse !== null ? `${a.avgDaysToResponse} days` : "—"}
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <AlertTriangle className="size-5 text-warning" />
                <div>
                  <div className="text-sm text-muted-foreground">Deadline misses</div>
                  <div className="text-xl font-semibold">{a.deadlineMisses}</div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-5">
                <TrendingUp className="size-5 text-success" />
                <div>
                  <div className="text-sm text-muted-foreground">In active pipeline</div>
                  <div className="text-xl font-semibold">{a.funnel.interviewing + a.funnel.offers}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
