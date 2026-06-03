import { createMomentumGoalAction } from "@/app/actions";
import { Badge, PageHeader, Panel, inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { getMomentumDashboard } from "@/lib/services/momentum";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const user = await requireUser("/goals");
  const dashboard = await getMomentumDashboard(user.id);

  return (
    <>
      <PageHeader title="Goals" eyebrow="Turn vague ambition into commitments" />
      <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <Panel>
          <h2 className="text-lg font-semibold">Add goal</h2>
          <form action={createMomentumGoalAction} className="mt-4 grid gap-4">
            <label className={labelClass}>
              Goal
              <input name="title" className={inputClass} placeholder="Land a hardware or embedded systems internship" required />
            </label>
            <label className={labelClass}>
              Why this matters
              <textarea name="why" className={inputClass} rows={3} placeholder="The deeper reason this should survive busy weeks" />
            </label>
            <label className={labelClass}>
              Success metric
              <input name="successMetric" className={inputClass} placeholder="Example: 3 project proof cards and 20 high-fit applications" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Category
                <select name="category" className={inputClass} defaultValue="career">
                  <option value="school">School</option>
                  <option value="career">Career</option>
                  <option value="project">Project</option>
                  <option value="personal">Personal</option>
                </select>
              </label>
              <label className={labelClass}>
                Cadence
                <select name="cadence" className={inputClass} defaultValue="weekly">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              <label className={labelClass}>
                Target date
                <input name="targetDate" className={inputClass} type="date" />
              </label>
            </div>
            <SubmitButton>Add goal</SubmitButton>
          </form>
        </Panel>

        <div className="grid gap-4">
          {dashboard.goals.length ? dashboard.goals.map((goal) => {
            const done = goal.tasks.filter((task) => task.status === "done").length;
            const open = goal.tasks.filter((task) => task.status !== "done").length;
            return (
              <Panel key={goal.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="info">{goal.category}</Badge>
                      <Badge tone={goal.status === "active" ? "good" : "neutral"}>{goal.status}</Badge>
                      <Badge>{goal.cadence}</Badge>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold">{goal.title}</h2>
                    {goal.why ? <p className="mt-2 text-sm text-stone-700">{goal.why}</p> : null}
                    {goal.successMetric ? <p className="mt-2 text-sm text-[var(--muted)]">Metric: {goal.successMetric}</p> : null}
                  </div>
                  <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm">
                    <p><span className="font-semibold">{done}</span> done</p>
                    <p><span className="font-semibold">{open}</span> open</p>
                    <p className="text-[var(--muted)]">{goal.targetDate ? `Target ${goal.targetDate.toLocaleDateString()}` : "No target date"}</p>
                  </div>
                </div>
              </Panel>
            );
          }) : <Panel><p className="text-sm text-[var(--muted)]">Add one goal to start steering the daily plan.</p></Panel>}
        </div>
      </div>
    </>
  );
}
