import { notFound } from "next/navigation";
import { markSubmittedAction } from "@/app/actions";
import { CopyButton } from "@/components/copy-button";
import { SubmitButton } from "@/components/submit-button";
import { Badge, ButtonLink, PageHeader, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getApplication } from "@/lib/services/application";

export const dynamic = "force-dynamic";

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/applications/${id}/submit`);
  const application = await getApplication(id, user.id);
  if (!application) notFound();
  const resume = application.resumeVersions[0];
  const cover = application.coverLetters[0];

  return (
    <>
      <PageHeader title="Application Submission" eyebrow={`${application.jobPosting.company.name} · ${application.jobPosting.title}`} action={<ButtonLink href={`/applications/${application.id}/tailor`} tone="secondary">Back to review</ButtonLink>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_.8fr]">
        <Panel>
          <h2 className="text-lg font-semibold">Manual Mode checklist</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <Checklist checked={Boolean(application.approvedAt)} label="Application packet approved" />
            <Checklist checked={Boolean(resume)} label="Tailored resume available" />
            <Checklist checked={Boolean(cover)} label="Cover letter draft available" />
            <Checklist checked={application.answers.every((answer) => answer.truthCheckStatus === "supported")} label="Non-sensitive answers are supported by stored facts" />
            <Checklist checked={application.jobPosting.sourceUrl !== null} label="Application URL saved" />
          </div>
          {application.jobPosting.sourceUrl ? (
            <a className="mt-5 inline-flex rounded-md bg-[#17473a] px-4 py-2 text-sm font-medium text-white hover:bg-[#11352c]" href={application.jobPosting.sourceUrl} target="_blank" rel="noreferrer">
              Open application URL
            </a>
          ) : null}
        </Panel>

        <Panel>
          <h2 className="text-lg font-semibold">Final confirmation</h2>
          <div className="mt-4 grid gap-2 text-sm text-stone-700">
            <p>No adapter will submit without approval.</p>
            <p>Restricted platforms remain Manual Mode only.</p>
            <p>Consent, demographic, veteran, disability, and legal eligibility questions require direct confirmation.</p>
          </div>
          <form action={markSubmittedAction} className="mt-5 grid gap-4">
            <input type="hidden" name="applicationId" value={application.id} />
            <label className="flex items-start gap-3 text-sm">
              <input className="mt-1" type="checkbox" required />
              I reviewed this application and confirm the information is accurate.
            </label>
            <SubmitButton>Mark submitted manually</SubmitButton>
          </form>
        </Panel>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {resume ? (
          <Panel>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Resume to copy</h2>
              <CopyButton value={resume.tailoredText} />
            </div>
            <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-stone-50 p-4 text-sm">{resume.tailoredText}</pre>
          </Panel>
        ) : null}
        <Panel>
          <h2 className="text-lg font-semibold">Answers</h2>
          <div className="mt-4 grid gap-3">
            {application.answers.map((answer) => (
              <div key={answer.id} className="rounded-md border border-[var(--line)] p-3">
                <div className="flex justify-between gap-3">
                  <p className="text-sm font-medium">{answer.jobQuestion?.questionText}</p>
                  <Badge tone={answer.truthCheckStatus === "supported" ? "good" : "warn"}>{answer.truthCheckStatus.replaceAll("_", " ")}</Badge>
                </div>
                <p className="mt-2 text-sm text-stone-700">{answer.answerText}</p>
                <div className="mt-3">
                  <CopyButton value={answer.answerText} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function Checklist({ checked, label }: { checked: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-[var(--line)] px-3 py-2">
      <span>{label}</span>
      <Badge tone={checked ? "good" : "warn"}>{checked ? "ready" : "check"}</Badge>
    </div>
  );
}
