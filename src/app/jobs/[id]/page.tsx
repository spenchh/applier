import { notFound } from "next/navigation";
import { generatePacketAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { Badge, ButtonLink, PageHeader, Panel, Score } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { readJson, toList } from "@/lib/json";
import type { ParsedJob } from "@/lib/schemas";
import { calculateFit } from "@/lib/services/fit";
import { getJob } from "@/lib/services/job";
import { getPrimaryProfile } from "@/lib/services/profile";
import { isRestrictedPlatform, roleCategoryLabel } from "@/lib/text";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/jobs/${id}`);
  const [job, profile] = await Promise.all([getJob(id, user.id), getPrimaryProfile(user.id)]);
  if (!job) notFound();
  const parsed = readJson<Partial<ParsedJob>>(job.parsedJson, {});
  const fit = profile ? calculateFit(job, profile.facts) : null;
  const existing = job.applications[0];

  return (
    <>
      <PageHeader
        title={job.title}
        eyebrow={job.company.name}
        action={existing ? <ButtonLink href={`/applications/${existing.id}/tailor`}>Open packet</ButtonLink> : null}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_.8fr]">
        <div className="grid gap-6">
          <Panel>
            <div className="flex flex-wrap items-center gap-2">
              {job.location ? <Badge>{job.location}</Badge> : null}
              {parsed.roleCategory ? <Badge tone="info">{roleCategoryLabel(parsed.roleCategory)}</Badge> : null}
              {job.workplaceType ? <Badge tone="info">{job.workplaceType}</Badge> : null}
              {job.internshipTerm ? <Badge tone="info">{job.internshipTerm}</Badge> : null}
              {isRestrictedPlatform(job.sourceUrl) ? <Badge tone="warn">restricted platform: manual only</Badge> : null}
            </div>
            <pre className="mt-5 whitespace-pre-wrap rounded-lg bg-[var(--surface-soft)] p-4 text-sm leading-relaxed text-stone-800">{job.rawDescription}</pre>
          </Panel>

          <Panel>
            <h2 className="text-lg font-semibold">Application questions</h2>
            <div className="mt-4 grid gap-3">
              {job.questions.map((question) => (
                <div key={question.id} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">{question.questionText}</p>
                    {question.sensitive ? <Badge tone="warn">sensitive</Badge> : <Badge tone="good">standard</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <Panel>
            <h2 className="text-lg font-semibold">Fit analysis</h2>
            {fit ? (
              <>
                <div className="mt-4">
                  <Score value={fit.fitScore} />
                </div>
                <p className="mt-4 text-sm text-stone-700">{fit.suggestedPositioning}</p>
                <div className="mt-4 grid gap-3">
                  <Bucket title="Matched evidence" items={fit.strongestEvidence.map((item) => `${item.requirement}: ${item.factTitle}`)} />
                  <Bucket title="Missing keywords" items={fit.missingRequirements} />
                  <Bucket title="Risks" items={fit.risks} tone="warn" />
                </div>
                <form action={generatePacketAction} className="mt-5">
                  <input type="hidden" name="jobId" value={job.id} />
                  <SubmitButton>{existing ? "Regenerate packet" : "Generate packet"}</SubmitButton>
                </form>
              </>
            ) : (
              <p className="mt-3 text-sm text-[var(--muted)]">Create a profile and Truth Vault facts before scoring this job.</p>
            )}
          </Panel>

          <Panel>
            <h2 className="text-lg font-semibold">Parsed fields</h2>
            <div className="mt-4 grid gap-4 text-sm">
              <Bucket title="Required" items={toList(job.requiredQualifications)} />
              <Bucket title="Preferred" items={toList(job.preferredQualifications)} />
              <Bucket title="Technologies" items={toList(job.technologies)} />
              <Bucket title="Keywords" items={toList(job.keywords)} />
              <Bucket title="Risk flags" items={readJson<string[]>(job.riskFlagsJson, [])} tone="warn" />
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Bucket({ title, items, tone = "neutral" }: { title: string; items: string[]; tone?: "neutral" | "warn" }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.length ? items.map((item) => <Badge key={item} tone={tone === "warn" ? "warn" : "neutral"}>{item}</Badge>) : <span className="text-sm text-[var(--muted)]">None</span>}
      </div>
    </div>
  );
}
