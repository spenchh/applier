import { PageHeader, Panel } from "@/components/ui";
import { getAnalytics } from "@/lib/services/analytics";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const analytics = await getAnalytics();
  return (
    <>
      <PageHeader title="Analytics" eyebrow="Application outcomes" />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="Applications" value={analytics.total} />
        <Metric label="Submitted" value={analytics.submitted} />
        <Metric label="Interview rate" value={`${analytics.interviewRate}%`} />
        <Metric label="Offer rate" value={`${analytics.offerRate}%`} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Panel>
          <h2 className="text-lg font-semibold">By status</h2>
          <Bars data={analytics.byStatus} />
        </Panel>
        <Panel>
          <h2 className="text-lg font-semibold">By source</h2>
          <Bars data={analytics.bySource} />
        </Panel>
      </div>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <Panel>
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold">{value}</p>
    </Panel>
  );
}

function Bars({ data }: { data: Record<string, number> }) {
  const max = Math.max(...Object.values(data), 1);
  return (
    <div className="mt-4 grid gap-3">
      {Object.entries(data).length ? (
        Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <div className="flex justify-between text-sm">
              <span>{key}</span>
              <span>{value}</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-stone-200">
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${(value / max) * 100}%` }} />
            </div>
          </div>
        ))
      ) : (
        <p className="text-sm text-[var(--muted)]">No data yet.</p>
      )}
    </div>
  );
}
