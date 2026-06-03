import { notFound } from "next/navigation";
import { approveApplicationAction } from "@/app/actions";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { Badge, ButtonLink, PageHeader, Panel, Score } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { readJson, toList } from "@/lib/json";
import { generatePortfolioPlanMock } from "@/lib/llm";
import type { KeywordCoverage, TruthCheck } from "@/lib/schemas";
import { getApplication } from "@/lib/services/application";

export const dynamic = "force-dynamic";

export default async function TailoringPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/applications/${id}/tailor`);
  const application = await getApplication(id, user.id);
  if (!application) notFound();
  const resume = application.resumeVersions[0];
  const cover = application.coverLetters[0];
  const truth = readJson<TruthCheck>(resume?.truthCheckJson, { supportedClaims: [], weakClaims: [], unsupportedClaims: [], recommendedEdits: [] });
  const coverage = readJson<KeywordCoverage>(resume?.keywordCoverageJson, { requiredPresent: [], preferredPresent: [], missingKeywords: [], intentionallyOmitted: [] });
  const portfolioPlan = generatePortfolioPlanMock({
    company: application.jobPosting.company.name,
    role: application.jobPosting.title,
    facts: application.userProfile.facts,
    keywords: toList(application.jobPosting.keywords),
  });

  return (
    <>
      <PageHeader
        title="Tailoring Studio"
        eyebrow={`${application.jobPosting.company.name} · ${application.jobPosting.title}`}
        action={<ButtonLink href={`/applications/${application.id}/submit`} tone="secondary">Submission screen</ButtonLink>}
      />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
        <div className="grid gap-6">
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Tailored resume</h2>
              {resume ? (
                <div className="flex gap-2">
                  <CopyButton value={resume.tailoredText} />
                  <ButtonLink href={`/api/resume-versions/${resume.id}/docx`} tone="secondary">DOCX</ButtonLink>
                  <ButtonLink href={`/api/resume-versions/${resume.id}/print`} tone="secondary">Print</ButtonLink>
                </div>
              ) : null}
            </div>
            {resume ? <pre className="mt-4 whitespace-pre-wrap rounded-md bg-stone-50 p-4 text-sm leading-relaxed">{resume.tailoredText}</pre> : <p className="mt-3 text-sm text-[var(--muted)]">No resume version was generated because no master resume exists.</p>}
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Cover letter</h2>
              {cover ? <CopyButton value={cover.text} /> : null}
            </div>
            {cover ? <pre className="mt-4 whitespace-pre-wrap rounded-md bg-stone-50 p-4 text-sm leading-relaxed">{cover.text}</pre> : null}
          </Panel>

          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Portfolio and CV strategy</h2>
              <CopyButton value={[portfolioPlan.headline, "", "Projects", ...portfolioPlan.projects, "", "Proof points", ...portfolioPlan.proofPoints, "", "Gaps", ...portfolioPlan.gaps].join("\n")} />
            </div>
            <p className="mt-3 text-sm text-stone-700">{portfolioPlan.headline}</p>
            <Bucket title="Portfolio projects to lead with" items={portfolioPlan.projects} tone="good" />
            <Bucket title="Proof points to echo in CV/resume" items={portfolioPlan.proofPoints} tone="info" />
            <Bucket title="Gaps to fill before applying" items={portfolioPlan.gaps} tone="warn" />
          </Panel>

          <Panel>
            <h2 className="text-lg font-semibold">Application answers</h2>
            <div className="mt-4 grid gap-3">
              {application.answers.map((answer) => (
                <div key={answer.id} className="rounded-md border border-[var(--line)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium">{answer.jobQuestion?.questionText ?? "Application answer"}</p>
                    <Badge tone={answer.truthCheckStatus === "supported" ? "good" : "warn"}>{answer.truthCheckStatus.replaceAll("_", " ")}</Badge>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm text-stone-700">{answer.answerText}</p>
                  <div className="mt-3">
                    <CopyButton value={answer.answerText} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="grid content-start gap-6">
          <Panel>
            <h2 className="text-lg font-semibold">Review status</h2>
            <div className="mt-4">
              <Score value={application.fitScore} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone={application.approvedAt ? "good" : "warn"}>{application.approvedAt ? "approved" : "not approved"}</Badge>
              <Badge tone="info">{application.applicationMode}</Badge>
            </div>
            <form action={approveApplicationAction} className="mt-5">
              <input type="hidden" name="applicationId" value={application.id} />
              <SubmitButton>Approve packet</SubmitButton>
            </form>
          </Panel>

          <Panel>
            <h2 className="text-lg font-semibold">Truth check</h2>
            <Bucket title="Supported claims" items={truth.supportedClaims} tone="good" />
            <Bucket title="Weak claims" items={truth.weakClaims} tone="warn" />
            <Bucket title="Unsupported claims" items={truth.unsupportedClaims} tone="bad" />
            <Bucket title="Recommended edits" items={truth.recommendedEdits} tone="info" />
          </Panel>

          <Panel>
            <h2 className="text-lg font-semibold">ATS keyword coverage</h2>
            <Bucket title="Present" items={[...coverage.requiredPresent, ...coverage.preferredPresent]} tone="good" />
            <Bucket title="Missing" items={coverage.missingKeywords} tone="warn" />
            <Bucket title="Intentionally omitted" items={coverage.intentionallyOmitted} tone="info" />
          </Panel>
        </div>
      </div>
    </>
  );
}

function Bucket({ title, items, tone }: { title: string; items: string[]; tone: "good" | "warn" | "bad" | "info" }) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.length ? items.map((item) => <Badge key={item} tone={tone}>{item}</Badge>) : <span className="text-sm text-[var(--muted)]">None</span>}
      </div>
    </div>
  );
}
