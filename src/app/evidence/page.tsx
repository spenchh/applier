import Link from "next/link";
import { createMomentumEvidenceAction } from "@/app/actions";
import { Badge, PageHeader, Panel, inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { getMomentumDashboard, skillList } from "@/lib/services/momentum";

export const dynamic = "force-dynamic";

export default async function EvidencePage() {
  const user = await requireUser("/evidence");
  const dashboard = await getMomentumDashboard(user.id);

  return (
    <>
      <PageHeader title="Proof Library" eyebrow="Build evidence before you need it" />
      <div className="grid gap-6 xl:grid-cols-[.85fr_1.15fr]">
        <Panel>
          <h2 className="text-lg font-semibold">Add proof card</h2>
          <form action={createMomentumEvidenceAction} className="mt-4 grid gap-4">
            <label className={labelClass}>
              Title
              <input name="title" className={inputClass} placeholder="Debugged UART communication issue in ECE lab" required />
            </label>
            <label className={labelClass}>
              Source
              <select name="source" className={inputClass} defaultValue="manual">
                <option value="manual">Manual</option>
                <option value="github">GitHub</option>
                <option value="coursework">Coursework</option>
                <option value="project">Project</option>
                <option value="career">Career</option>
              </select>
            </label>
            <label className={labelClass}>
              Link
              <input name="url" className={inputClass} type="url" placeholder="https://..." />
            </label>
            <label className={labelClass}>
              What this proves
              <textarea name="summary" className={inputClass} rows={5} placeholder="What happened, what you did, what changed, and why it matters" required />
            </label>
            <label className={labelClass}>
              Skills
              <input name="skills" className={inputClass} placeholder="C, debugging, circuits, teamwork" />
            </label>
            <SubmitButton>Add proof</SubmitButton>
          </form>
        </Panel>

        <div className="grid gap-4">
          {dashboard.evidence.length ? dashboard.evidence.map((item) => {
            const skills = skillList(item.skillsJson);
            return (
              <Panel key={item.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone="info">{item.source}</Badge>
                      <Badge>{item.capturedAt.toLocaleDateString()}</Badge>
                    </div>
                    <h2 className="mt-3 text-lg font-semibold">{item.title}</h2>
                    <p className="mt-2 text-sm text-stone-700">{item.summary}</p>
                    {skills.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {skills.map((skill) => <Badge key={skill} tone="good">{skill}</Badge>)}
                      </div>
                    ) : null}
                  </div>
                  {item.url ? <Link className="text-sm font-medium text-emerald-700" href={item.url} target="_blank">Open proof</Link> : null}
                </div>
              </Panel>
            );
          }) : <Panel><p className="text-sm text-[var(--muted)]">No proof yet. Sync GitHub, complete a task, or add one manually.</p></Panel>}
        </div>
      </div>
    </>
  );
}
