import { createMomentumCheckInAction, completeMomentumTaskAction } from "@/app/actions";
import { Badge, PageHeader, Panel, inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { readJson } from "@/lib/json";
import { getMomentumDashboard } from "@/lib/services/momentum";

export const dynamic = "force-dynamic";

type PlanItem = {
  id: string;
  title: string;
  reason: string;
  minutes: number;
  proof: string;
  source: string;
};

export default async function CoachPage() {
  const user = await requireUser("/coach");
  const dashboard = await getMomentumDashboard(user.id);
  const latestPlan = readJson<PlanItem[]>(dashboard.latestCheckIn?.planJson, dashboard.plan);

  return (
    <>
      <PageHeader title="AI Coach" eyebrow="Daily accountability loop" />
      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <Panel>
          <h2 className="text-lg font-semibold">Run a check-in</h2>
          <p className="mt-2 text-sm text-stone-700">Tell Momentum how much time and attention you actually have today. It will shrink the plan instead of pretending you have infinite energy.</p>
          <form action={createMomentumCheckInAction} className="mt-4 grid gap-4">
            <label className={labelClass}>
              Mood
              <select name="mood" className={inputClass} defaultValue="steady">
                <option value="locked in">Locked in</option>
                <option value="steady">Steady</option>
                <option value="tired">Tired</option>
                <option value="overwhelmed">Overwhelmed</option>
              </select>
            </label>
            <label className={labelClass}>
              Available minutes today
              <input name="availableMinutes" className={inputClass} type="number" min={15} max={720} defaultValue={dashboard.latestCheckIn?.availableMinutes ?? 120} />
            </label>
            <label className={labelClass}>
              What should today bias toward?
              <input name="focus" className={inputClass} placeholder="ECE, internship search, GitHub, health, exams" />
            </label>
            <label className={labelClass}>
              Blockers
              <textarea name="blockers" className={inputClass} rows={4} placeholder="Low sleep, exam tomorrow, stuck on lab, too many tabs open..." />
            </label>
            <SubmitButton>Generate today&apos;s plan</SubmitButton>
          </form>
        </Panel>

        <div className="grid gap-6">
          <Panel>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Current coach plan</h2>
                <p className="text-sm text-[var(--muted)]">{dashboard.latestCheckIn ? `Last check-in ${dashboard.latestCheckIn.createdAt.toLocaleString()}` : "Generated from current commitments"}</p>
              </div>
              <Badge tone="good">{latestPlan.reduce((sum, item) => sum + item.minutes, 0)} min</Badge>
            </div>
            <div className="mt-5 grid gap-3">
              {latestPlan.length ? latestPlan.map((item, index) => (
                <div key={`${item.id}-${index}`} className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={index === 0 ? "good" : "neutral"}>{index === 0 ? "first" : `${item.minutes} min`}</Badge>
                        <Badge tone="info">{item.source}</Badge>
                      </div>
                      <p className="mt-3 font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-stone-700">{item.reason}</p>
                      <p className="mt-2 text-xs text-[var(--muted)]">Proof: {item.proof}</p>
                    </div>
                    <form action={completeMomentumTaskAction} className="grid gap-2 md:w-64">
                      <input type="hidden" name="taskId" value={item.id} />
                      <input type="hidden" name="returnTo" value="/coach" />
                      <input name="proofNote" className={inputClass} placeholder="Proof note or link" />
                      <button type="submit" className="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--brand-hover)]">
                        Done
                      </button>
                    </form>
                  </div>
                </div>
              )) : <p className="text-sm text-[var(--muted)]">No plan yet. Add tasks or connect sources.</p>}
            </div>
          </Panel>

          <Panel>
            <h2 className="text-lg font-semibold">Accountability rules</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <Rule title="Shrink before skipping" body="If a task keeps slipping, make it smaller instead of pretending tomorrow will be magic." />
              <Rule title="Proof beats vibes" body="A commit, screenshot, submission, or note matters more than a vague feeling that you worked." />
              <Rule title="Protect recovery" body="If you are fried, the plan should be honest and small, not performative." />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Rule({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-3">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-stone-700">{body}</p>
    </div>
  );
}
