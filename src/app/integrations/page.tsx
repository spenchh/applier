import { importMomentumTextAction, saveMomentumIntegrationAction, syncCanvasAction, syncGitHubAction } from "@/app/actions";
import { Badge, PageHeader, Panel, inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { readJson } from "@/lib/json";
import { getMomentumDashboard } from "@/lib/services/momentum";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const user = await requireUser("/integrations");
  const dashboard = await getMomentumDashboard(user.id);
  const integrations = new Map(dashboard.integrations.map((integration) => [integration.provider, integration]));
  const canvas = integrations.get("canvas");
  const github = integrations.get("github");

  return (
    <>
      <PageHeader title="Connections" eyebrow="Bring your real life into the plan" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <ConnectionHeader title="Canvas" status={canvas?.status ?? "not_connected"} syncedAt={canvas?.lastSyncedAt} />
          <p className="mt-2 text-sm text-stone-700">Sync upcoming assignments from Canvas into actionable commitments. Tokens are used for this sync only and are not saved.</p>
          <form action={syncCanvasAction} className="mt-4 grid gap-4">
            <label className={labelClass}>
              Canvas URL
              <input name="canvasUrl" className={inputClass} defaultValue={readJson<{ canvasUrl?: string }>(canvas?.configJson, {}).canvasUrl ?? "https://canvas.northwestern.edu"} required />
            </label>
            <label className={labelClass}>
              Canvas access token
              <input name="accessToken" className={inputClass} type="password" placeholder="Paste token for one-time sync" required />
            </label>
            {canvas?.lastError ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{canvas.lastError}</p> : null}
            <SubmitButton>Sync Canvas assignments</SubmitButton>
          </form>
        </Panel>

        <Panel>
          <ConnectionHeader title="GitHub" status={github?.status ?? "not_connected"} syncedAt={github?.lastSyncedAt} />
          <p className="mt-2 text-sm text-stone-700">Turn repositories and stale projects into proof cards and maintenance commitments.</p>
          <form action={syncGitHubAction} className="mt-4 grid gap-4">
            <label className={labelClass}>
              GitHub username
              <input name="username" className={inputClass} defaultValue={readJson<{ username?: string }>(github?.configJson, {}).username ?? ""} placeholder="spenchh" />
            </label>
            <label className={labelClass}>
              Optional access token
              <input name="accessToken" className={inputClass} type="password" placeholder="Needed for private repos" />
            </label>
            {github?.lastError ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{github.lastError}</p> : null}
            <SubmitButton>Sync GitHub proof</SubmitButton>
          </form>
        </Panel>

        <ImportPanel source="syllabus" title="Syllabus or class notes" placeholder={"Paste assignment lines, deadlines, exam dates, or class project requirements.\nExample: ECE lab report due 6/12; final project demo 6/20"} />
        <ImportPanel source="simplify" title="Simplify tracker" placeholder={"Paste rows, notes, or exported tracker text from Simplify.\nExample: Company, role, deadline, status, next step"} />
        <ImportPanel source="handshake" title="Handshake opportunities" placeholder={"Paste saved jobs, career fair notes, recruiter messages, or event deadlines from Handshake."} />

        <Panel>
          <ConnectionHeader title="Google Calendar and Outlook" status={oauthStatus(integrations)} syncedAt={integrations.get("google_calendar")?.lastSyncedAt ?? integrations.get("outlook")?.lastSyncedAt ?? null} />
          <p className="mt-2 text-sm text-stone-700">Calendar/email sync needs OAuth app credentials before it can be safely enabled. The app is ready for those connection slots, but it should not ask for your Google or Microsoft password.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <form action={saveMomentumIntegrationAction} className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-3">
              <input type="hidden" name="provider" value="google_calendar" />
              <input type="hidden" name="label" value="Google Calendar" />
              <input type="hidden" name="note" value="Needs OAuth credentials" />
              <p className="font-medium">Google Calendar</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Reads events once OAuth is configured.</p>
              <button type="submit" className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-medium shadow-sm">Mark as planned</button>
            </form>
            <form action={saveMomentumIntegrationAction} className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-3">
              <input type="hidden" name="provider" value="outlook" />
              <input type="hidden" name="label" value="Outlook / Microsoft 365" />
              <input type="hidden" name="note" value="Needs Microsoft Graph OAuth credentials" />
              <p className="font-medium">Outlook / Microsoft 365</p>
              <p className="mt-1 text-sm text-[var(--muted)]">Reads events and deadline emails through Graph after OAuth.</p>
              <button type="submit" className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-medium shadow-sm">Mark as planned</button>
            </form>
          </div>
        </Panel>
      </div>
    </>
  );
}

function ConnectionHeader({ title, status, syncedAt }: { title: string; status: string; syncedAt?: Date | null }) {
  const tone = status === "connected" ? "good" : status === "error" ? "warn" : status === "needs_oauth" ? "info" : "neutral";
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">{syncedAt ? `Last synced ${syncedAt.toLocaleString()}` : "Not synced yet"}</p>
      </div>
      <Badge tone={tone}>{status.replaceAll("_", " ")}</Badge>
    </div>
  );
}

function ImportPanel({ source, title, placeholder }: { source: string; title: string; placeholder: string }) {
  return (
    <Panel>
      <ConnectionHeader title={title} status="paste_import" />
      <p className="mt-2 text-sm text-stone-700">Paste text and Momentum will extract likely commitments. This is the safest path for tools without a useful public student API.</p>
      <form action={importMomentumTextAction} className="mt-4 grid gap-4">
        <input type="hidden" name="source" value={source} />
        <label className={labelClass}>
          Import text
          <textarea name="text" className={inputClass} rows={8} placeholder={placeholder} required />
        </label>
        <SubmitButton>Import commitments</SubmitButton>
      </form>
    </Panel>
  );
}

function oauthStatus(integrations: Map<string, { status: string }>) {
  const google = integrations.get("google_calendar")?.status;
  const outlook = integrations.get("outlook")?.status;
  if (google === "connected" || outlook === "connected") return "connected";
  if (google === "needs_oauth" || outlook === "needs_oauth") return "needs_oauth";
  return "not_connected";
}
