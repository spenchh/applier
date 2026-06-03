import Link from "next/link";
import { StatusSelect } from "@/components/status-select";
import { Badge, ButtonLink, EmptyState, PageHeader, Panel, Score } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { listApplications } from "@/lib/services/application";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const user = await requireUser("/tracker");
  const applications = await listApplications(user.id);
  const offers = applications.filter((application) => application.status === "offer");
  return (
    <>
      <PageHeader title="Tracker" eyebrow="Applications and outcomes" action={<ButtonLink href="/api/export/applications.csv" tone="secondary">CSV export</ButtonLink>} />
      {offers.length ? <OfferOverview offers={offers} /> : null}
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

function OfferOverview({ offers }: { offers: Awaited<ReturnType<typeof listApplications>> }) {
  return (
    <Panel className="mb-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Offer overview</h2>
          <p className="mt-1 text-sm text-stone-700">Use this as the command center before accepting anything.</p>
        </div>
        <Badge tone="good">{offers.length} active offer{offers.length === 1 ? "" : "s"}</Badge>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <OfferBox title="Offer details" items={["Role title and team", "Start date and duration", "Pay, stipend, housing, relocation", "Deadline to accept"]} />
        <OfferBox title="People to contact" items={["Recruiter email", "Hiring manager", "University career adviser", "International office if relevant"]} />
        <OfferBox title="Decision checks" items={["Learning value", "Manager support", "Return-offer path", "Location and schedule fit"]} />
        <OfferBox title="Before accepting" items={["Save offer letter", "Ask unresolved questions", "Update tracker notes", "Mark other applications respectfully"]} />
      </div>
      <div className="mt-4 grid gap-3">
        {offers.map((offer) => (
          <div key={offer.id} className="flex flex-col gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-sm shadow-sm md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-semibold text-emerald-950">{offer.jobPosting.company.name} - {offer.jobPosting.title}</p>
              <p className="text-emerald-900">Fit score {offer.fitScore}. Review tailored materials, questions, and submission notes before making a decision.</p>
            </div>
            <Link className="font-medium text-emerald-800" href={`/applications/${offer.id}/tailor`}>
              Open offer file
            </Link>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function OfferBox({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg bg-[var(--surface-soft)] p-3 shadow-sm">
      <p className="text-sm font-semibold">{title}</p>
      <ul className="mt-2 grid gap-1 text-sm text-stone-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
