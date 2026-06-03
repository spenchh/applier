import { createMomentumTaskAction, completeMomentumTaskAction } from "@/app/actions";
import { Badge, PageHeader, Panel, inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { getMomentumDashboard } from "@/lib/services/momentum";

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const user = await requireUser("/plan");
  const dashboard = await getMomentumDashboard(user.id);
  const groups = [
    { title: "Overdue", tasks: dashboard.overdue },
    { title: "Today", tasks: dashboard.dueToday },
    { title: "This week", tasks: dashboard.upcoming },
    { title: "Backlog", tasks: dashboard.openTasks.filter((task) => !task.dueAt).slice(0, 12) },
  ];

  return (
    <>
      <PageHeader title="Today Plan" eyebrow="Execute the right things" />
      <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
        <Panel>
          <h2 className="text-lg font-semibold">Add commitment</h2>
          <form action={createMomentumTaskAction} className="mt-4 grid gap-4">
            <label className={labelClass}>
              Task
              <input name="title" className={inputClass} placeholder="Finish ECE lab write-up" required />
            </label>
            <label className={labelClass}>
              Why it matters
              <textarea name="description" className={inputClass} rows={3} placeholder="What this unlocks or prevents" />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Category
                <select name="category" className={inputClass} defaultValue="school">
                  <option value="school">School</option>
                  <option value="career">Career</option>
                  <option value="project">Project</option>
                  <option value="personal">Personal</option>
                </select>
              </label>
              <label className={labelClass}>
                Priority
                <select name="priority" className={inputClass} defaultValue="medium">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label className={labelClass}>
                Minutes
                <input name="estimatedMinutes" className={inputClass} type="number" min={5} max={480} defaultValue={45} />
              </label>
              <label className={labelClass}>
                Due
                <input name="dueAt" className={inputClass} type="datetime-local" />
              </label>
            </div>
            <label className={labelClass}>
              Proof required
              <input name="proofNote" className={inputClass} placeholder="Screenshot, commit, file, email, or short note" />
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-700">
              <input name="proofRequired" type="checkbox" defaultChecked className="h-4 w-4 rounded border-[var(--line)]" />
              Ask for proof when completed
            </label>
            <SubmitButton>Add task</SubmitButton>
          </form>
        </Panel>

        <div className="grid gap-6">
          {groups.map((group) => (
            <Panel key={group.title}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">{group.title}</h2>
                <Badge tone={group.tasks.length ? "info" : "neutral"}>{group.tasks.length}</Badge>
              </div>
              <div className="mt-4 grid gap-3">
                {group.tasks.length ? group.tasks.map((task) => <TaskRow key={task.id} task={task} />) : <p className="text-sm text-[var(--muted)]">Nothing here.</p>}
              </div>
            </Panel>
          ))}
        </div>
      </div>
    </>
  );
}

function TaskRow({ task }: { task: { id: string; title: string; description: string | null; category: string; priority: string; source: string; dueAt: Date | null; proofNote: string | null } }) {
  return (
    <div className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={task.priority === "high" ? "warn" : "neutral"}>{task.priority}</Badge>
            <Badge tone="info">{task.category}</Badge>
            <Badge>{task.source}</Badge>
          </div>
          <p className="mt-3 font-semibold">{task.title}</p>
          {task.description ? <p className="mt-1 text-sm text-stone-700">{task.description}</p> : null}
          <p className="mt-2 text-xs text-[var(--muted)]">{task.dueAt ? `Due ${task.dueAt.toLocaleString()}` : "No due date"} · Proof: {task.proofNote || "short completion note"}</p>
        </div>
        <form action={completeMomentumTaskAction} className="grid gap-2 md:w-64">
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="returnTo" value="/plan" />
          <input name="proofNote" className={inputClass} placeholder="Proof note or link" />
          <button type="submit" className="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--brand-hover)]">
            Complete
          </button>
        </form>
      </div>
    </div>
  );
}
