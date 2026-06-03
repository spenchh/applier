import { createResumeAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Badge, EmptyState, PageHeader, Panel, inputClass, labelClass } from "@/components/ui";
import { getPrimaryProfile } from "@/lib/services/profile";

export const dynamic = "force-dynamic";

export default async function ResumesPage() {
  const profile = await getPrimaryProfile();
  return (
    <>
      <PageHeader title="Resume Manager" eyebrow="ATS-friendly materials" />
      <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <Panel>
          <h2 className="mb-4 text-lg font-semibold">Add master resume</h2>
          <form action={createResumeAction} className="grid gap-4">
            <label className={labelClass}>
              Name
              <input name="name" className={inputClass} defaultValue="Master Resume" required />
            </label>
            <label className={labelClass}>
              Base template
              <select name="baseType" className={inputClass} defaultValue="software_engineering">
                <option value="software_engineering">Software engineering</option>
                <option value="data_science">Data science</option>
                <option value="product_management">Product management</option>
                <option value="design_ux">Design / UX</option>
                <option value="finance">Finance</option>
                <option value="consulting">Consulting</option>
                <option value="research">Research</option>
                <option value="marketing">Marketing</option>
                <option value="operations">Operations</option>
                <option value="communications">Communications</option>
                <option value="general_internship">General internship</option>
              </select>
            </label>
            <label className={labelClass}>
              Resume text
              <textarea name="rawText" className={inputClass} rows={12} required />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="isMaster" type="checkbox" defaultChecked />
              Set as master resume
            </label>
            <SubmitButton>Save resume</SubmitButton>
          </form>
        </Panel>
        <div className="grid gap-3">
          {profile?.resumes.length ? (
            profile.resumes.map((resume) => (
              <Panel key={resume.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{resume.name}</p>
                    <p className="text-sm text-[var(--muted)]">{resume.baseType.replaceAll("_", " ")}</p>
                  </div>
                  {resume.isMaster ? <Badge tone="good">master</Badge> : <Badge>base</Badge>}
                </div>
                <pre className="mt-4 max-h-64 overflow-auto rounded-md bg-stone-50 p-3 text-xs leading-relaxed text-stone-700">{resume.rawText}</pre>
              </Panel>
            ))
          ) : (
            <EmptyState title="No resumes yet" body="Paste a master resume to unlock tailored resume versions." />
          )}
        </div>
      </div>
    </>
  );
}
