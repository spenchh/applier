import Link from "next/link";
import { createJobAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Badge, EmptyState, PageHeader, Panel, inputClass, labelClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { toList } from "@/lib/json";
import { listJobs } from "@/lib/services/job";
import { getSettings } from "@/lib/services/settings";
import { isRestrictedPlatform, roleCategories, roleCategoryLabel } from "@/lib/text";

export const dynamic = "force-dynamic";

export default async function JobsPage() {
  const user = await requireUser("/jobs");
  const [jobs, settings] = await Promise.all([listJobs(user.id), getSettings()]);
  const targetRoles = toList(settings.targetRoleTypes);
  const targetIndustries = toList(settings.targetIndustries);
  return (
    <>
      <PageHeader title="Job Inbox" eyebrow="Import and triage" />
      <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
        <Panel>
          <h2 className="mb-4 text-lg font-semibold">Add job posting</h2>
          <div className="mb-4 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-3 text-sm text-stone-700">
            <p className="font-medium">Current targets</p>
            <p>{targetRoles.length ? targetRoles.join(", ") : "Any role family"}</p>
            <p>{targetIndustries.length ? targetIndustries.join(", ") : "Any industry"}</p>
          </div>
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-sm text-emerald-900">
            <p className="font-medium">Job-board inspired import</p>
            <p>Paste descriptions or URLs from LinkedIn, Indeed, Handshake, school boards, and company career pages. Restricted boards stay Manual Mode, but InternPilot will still parse requirements and tailor your materials.</p>
          </div>
          <form action={createJobAction} className="grid gap-4">
            <label className={labelClass}>
              Source URL
              <input name="sourceUrl" className={inputClass} type="url" placeholder="https://..." />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className={labelClass}>
                Company
                <input name="company" className={inputClass} />
              </label>
              <label className={labelClass}>
                Role title
                <input name="title" className={inputClass} />
              </label>
              <label className={labelClass}>
                Role family
                <select name="roleCategory" className={inputClass} defaultValue="general_internship">
                  {roleCategories.map((category) => (
                    <option key={category} value={category}>
                      {roleCategoryLabel(category)}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                Location
                <input name="location" className={inputClass} />
              </label>
              <label className={labelClass}>
                Source name
                <input name="sourceName" className={inputClass} list="job-source-options" placeholder="LinkedIn, Indeed, Handshake, Greenhouse" />
              </label>
            </div>
            <label className={labelClass}>
              Job description
              <textarea name="rawDescription" className={inputClass} rows={14} required />
            </label>
            <datalist id="job-source-options">
              {["LinkedIn", "Indeed", "Handshake", "Company careers page", "Greenhouse", "Lever", "Ashby", "SmartRecruiters", "School career center"].map((source) => (
                <option key={source} value={source} />
              ))}
            </datalist>
            <SubmitButton>Parse job</SubmitButton>
          </form>
        </Panel>

        <div className="grid gap-3">
          {jobs.length ? (
            jobs.map((job) => {
              const risks = toList(job.riskFlagsJson);
              return (
                <Link key={job.id} href={`/jobs/${job.id}`} className="block rounded-lg border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] transition hover:bg-[var(--surface-soft)]">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{job.title}</p>
                      <p className="text-sm text-[var(--muted)]">{job.company.name}</p>
                    </div>
                    {isRestrictedPlatform(job.sourceUrl) ? <Badge tone="warn">manual only</Badge> : job.atsProvider ? <Badge tone="info">{job.atsProvider}</Badge> : <Badge>manual</Badge>}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {toList(job.keywords).slice(0, 7).map((keyword) => (
                      <Badge key={keyword} tone="info">
                        {keyword}
                      </Badge>
                    ))}
                    {risks.length ? <Badge tone="warn">{risks.length} risk flags</Badge> : <Badge tone="good">no obvious flags</Badge>}
                  </div>
                </Link>
              );
            })
          ) : (
            <EmptyState title="No jobs imported" body="Paste a posting, official ATS URL, or manually create a job to begin." />
          )}
        </div>
      </div>
    </>
  );
}
