import Link from "next/link";
import { StatusSelect } from "@/components/status-select";
import { Badge, ButtonLink, EmptyState, PageHeader, Panel, Score } from "@/components/ui";
import { listApplications } from "@/lib/services/application";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const applications = await listApplications();
  return (
    <>
      <PageHeader title="Tracker" eyebrow="Applications and outcomes" action={<ButtonLink href="/api/export/applications.csv" tone="secondary">CSV export</ButtonLink>} />
      {applications.length ? (
        <Panel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="border-b border-[var(--line)] text-xs uppercase tracking-[0.08em] text-[var(--muted)]">
                <tr>
                  <th className="py-3">Company</th>
                  <th>Role</th>
                  <th>Fit</th>
                  <th>Status</th>
                  <th>Mode</th>
                  <th>Updated</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id} className="border-b border-[var(--line)] last:border-0">
                    <td className="py-3 font-medium">{application.jobPosting.company.name}</td>
                    <td>{application.jobPosting.title}</td>
                    <td>
                      <Score value={application.fitScore} />
                    </td>
                    <td>
                      <StatusSelect applicationId={application.id} value={application.status} />
                    </td>
                    <td>
                      <Badge tone="info">{application.applicationMode}</Badge>
                    </td>
                    <td>{application.updatedAt.toLocaleDateString()}</td>
                    <td>
                      <Link className="font-medium text-emerald-700" href={`/applications/${application.id}/tailor`}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      ) : (
        <EmptyState title="No applications yet" body="Generate a packet from a job detail page to start tracking." action={<ButtonLink href="/jobs">Open Job Inbox</ButtonLink>} />
      )}
    </>
  );
}
