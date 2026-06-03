import Link from "next/link";
import { Badge, ButtonLink, EmptyState, PageHeader, Panel, Score } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listApplications } from "@/lib/services/application";

export const dynamic = "force-dynamic";

export default async function ReviewQueuePage() {
  const user = await requireUser("/applications/review");
  const applications = await listApplications(user.id);
  const queue = applications.filter((application) => ["drafted", "ready for review", "approved", "needs info"].includes(application.status));

  return (
    <>
      <PageHeader title="Application Review Queue" eyebrow="Batch workflow" action={<ButtonLink href="/jobs">Import jobs</ButtonLink>} />
      {queue.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {queue.map((application) => {
            const missing = application.answers.filter((answer) => answer.truthCheckStatus !== "supported").length;
            return (
              <Panel key={application.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{application.jobPosting.title}</p>
                    <p className="text-sm text-[var(--muted)]">{application.jobPosting.company.name}</p>
                  </div>
                  <Badge tone={application.status === "approved" ? "good" : "warn"}>{application.status}</Badge>
                </div>
                <div className="mt-4">
                  <Score value={application.fitScore} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="info">{application.applicationMode}</Badge>
                  <Badge tone={application.resumeVersions.length ? "good" : "warn"}>{application.resumeVersions.length ? "resume ready" : "resume missing"}</Badge>
                  <Badge tone={missing ? "warn" : "good"}>{missing ? `${missing} need input` : "answers supported"}</Badge>
                </div>
                <div className="mt-5 flex gap-2">
                  <ButtonLink href={`/applications/${application.id}/tailor`}>Review</ButtonLink>
                  <Link href={`/jobs/${application.jobPostingId}`} className="inline-flex items-center rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium hover:bg-[#f0f0ea]">
                    Job
                  </Link>
                </div>
              </Panel>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Queue is empty" body="Generate packets from job detail pages to review them one by one." action={<ButtonLink href="/jobs">Open Job Inbox</ButtonLink>} />
      )}
    </>
  );
}
