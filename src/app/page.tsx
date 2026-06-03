import { ArrowRight, CheckCircle2, CircleAlert, LibraryBig, PlugZap, Target } from "lucide-react";
import Link from "next/link";
import { completeMomentumTaskAction } from "@/app/actions";
import { Badge, ButtonLink, EmptyState, PageHeader, Panel, Score } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getMomentumDashboard } from "@/lib/services/momentum";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser("/");
  const dashboard = await getMomentumDashboard(user.id);

  return (
    <>
      <PageHeader title="Command Center" eyebrow="Momentum" action={<ButtonLink href="/coach">Run check-in</ButtonLink>} />

      <div className="grid gap-4 md:grid-cols-4">
        <Metric title="Accountability" value={`${dashboard.metrics.accountabilityScore}%`} icon={<Target className="h-4 w-4 text-emerald-700" aria-hidden />} />
        <Metric title="Done this week" value={dashboard.metrics.doneThisWeek} icon={<CheckCircle2 className="h-4 w-4 text-sky-700" aria-hidden />} />
        <Metric title="Proof cards" value={dashboard.metrics.proofThisWeek} icon={<LibraryBig className="h-4 w-4 text-amber-700" aria-hidden />} />
        <Metric title="Connections" value={dashboard.metrics.connectedCount} icon={<PlugZap className="h-4 w-4 text-rose-700" aria-hidden />} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
        <Panel>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Do next</h2>
              <p className="text-sm text-[var(--muted)]">A realistic plan from deadlines, goals, project proof, and career commitments.</p>
            </div>
            <Score value={dashboard.metrics.accountabilityScore} />
          </div>
          <div className="mt-5 grid gap-3">
            {dashboard.plan.length ? (
              dashboard.plan.map((item, index) => (
                <div key={item.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone={index === 0 ? "good" : "neutral"}>{index === 0 ? "start here" : `${item.minutes} min`}</Badge>
                        <Badge tone="info">{item.source}</Badge>
                      </div>
                      <p className="mt-3 font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-stone-700">{item.reason}</p>
                      <p className="mt-2 text-xs text-[var(--muted)]">Proof: {item.proof}</p>
                    </div>
                    <QuickComplete taskId={item.id} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState title="No commitments yet" body="Create goals or connect Canvas/GitHub so Momentum can tell you what matters today." action={<ButtonLink href="/integrations">Connect sources</ButtonLink>} />
            )}
          </div>
        </Panel>

        <div className="grid content-start gap-6">
          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Risk radar</h2>
              <CircleAlert className="h-4 w-4 text-amber-700" aria-hidden />
            </div>
            <div className="mt-4 grid gap-3">
              <RadarRow label="Overdue" count={dashboard.overdue.length} tone={dashboard.overdue.length ? "warn" : "good"} />
              <RadarRow label="Due today" count={dashboard.dueToday.length} tone={dashboard.dueToday.length ? "warn" : "neutral"} />
              <RadarRow label="Upcoming this week" count={dashboard.upcoming.length} tone="info" />
              <RadarRow label="Open commitments" count={dashboard.metrics.openCount} tone="neutral" />
            </div>
          </Panel>

          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Active goals</h2>
              <Link href="/goals" className="inline-flex items-center gap-1 text-sm font-medium text-emerald-700">
                Open <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <div className="mt-4 grid gap-3">
              {dashboard.goals.slice(0, 4).map((goal) => (
                <div key={goal.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{goal.title}</p>
                    <Badge tone={goal.status === "active" ? "good" : "neutral"}>{goal.status}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{goal.successMetric || goal.why || "No metric yet."}</p>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Recent proof</h2>
            <p className="text-sm text-[var(--muted)]">Evidence from GitHub, completed tasks, coursework, applications, or manual notes.</p>
          </div>
          <ButtonLink href="/evidence" tone="secondary">Proof library</ButtonLink>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {dashboard.evidence.length ? dashboard.evidence.slice(0, 6).map((item) => (
            <div key={item.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-3">
              <Badge tone="info">{item.source}</Badge>
              <p className="mt-3 font-medium">{item.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-stone-700">{item.summary}</p>
            </div>
          )) : <p className="text-sm text-[var(--muted)]">Complete a task or sync GitHub to create proof cards.</p>}
        </div>
      </Panel>
    </>
  );
}

function Metric({ title, value, icon }: { title: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Panel>
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{title}</p>
        {icon}
      </div>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </Panel>
  );
}

function RadarRow({ label, count, tone }: { label: string; count: number; tone: "good" | "warn" | "info" | "neutral" }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-3 py-2 text-sm">
      <span>{label}</span>
      <Badge tone={tone}>{count}</Badge>
    </div>
  );
}

function QuickComplete({ taskId }: { taskId: string }) {
  return (
    <form action={completeMomentumTaskAction} className="grid gap-2 md:w-64">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="returnTo" value="/" />
      <input name="proofNote" className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm outline-none ring-[var(--focus)] transition focus:border-[var(--brand)] focus:ring-4" placeholder="Proof note or link" />
      <button type="submit" className="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--brand-hover)]">
        Mark done
      </button>
    </form>
  );
}
