import { importCalendarFeedAction, importMomentumTextAction, syncGitHubAction } from "@/app/actions";
import { Badge, PageHeader, Panel, inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { requireUser } from "@/lib/auth";
import { readJson } from "@/lib/json";
import { getMomentumDashboard } from "@/lib/services/momentum";
import { oauthSetupStatus } from "@/lib/services/oauth";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const user = await requireUser("/integrations");
  const dashboard = await getMomentumDashboard(user.id);
  const integrations = new Map(dashboard.integrations.map((integration) => [integration.provider, integration]));
  const canvas = integrations.get("canvas");
  const github = integrations.get("github");
  const calendarIcs = integrations.get("calendar_ics");
  const canvasConfig = readJson<{ canvasUrl?: string }>(canvas?.configJson, {});
  const githubConfig = readJson<{ username?: string }>(github?.configJson, {});
  const calendarConfig = readJson<{ sourceName?: string }>(calendarIcs?.configJson, {});
  const setup = {
    canvas: oauthSetupStatus("canvas"),
    github: oauthSetupStatus("github"),
    google: oauthSetupStatus("google_calendar"),
    outlook: oauthSetupStatus("outlook"),
  };

  return (
    <>
      <PageHeader title="Connections" eyebrow="Bring your real life into the plan" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <ConnectionHeader title="Canvas" status={canvas?.status ?? "not_connected"} syncedAt={canvas?.lastSyncedAt} />
          <p className="mt-2 text-sm text-stone-700">Sign into Canvas and approve access. Momentum will pull upcoming assignments into your plan.</p>
          {setup.canvas.configured ? (
            <form action="/api/integrations/canvas/connect" method="get" className="mt-4 grid gap-4">
              <label className={labelClass}>
                Canvas URL
                <input name="canvasUrl" className={inputClass} defaultValue={canvasConfig.canvasUrl ?? "https://canvas.northwestern.edu"} required />
              </label>
              <FriendlyError error={canvas?.lastError} provider="Canvas" />
              <button type="submit" className="liquid-button rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm">Sign in with Canvas</button>
            </form>
          ) : (
            <SetupNotice
              title="Canvas sign-in is not ready yet"
              body="Canvas requires a Developer Key from Northwestern or the Canvas admin before Momentum can open the provider login screen. Use the syllabus or class-notes importer below for now."
            />
          )}
        </Panel>

        <Panel>
          <ConnectionHeader title="GitHub" status={github?.status ?? "not_connected"} syncedAt={github?.lastSyncedAt} />
          <p className="mt-2 text-sm text-stone-700">Momentum can read public repositories now, then turn recent projects into proof cards and maintenance tasks.</p>
          <form action={syncGitHubAction} className="mt-4 grid gap-4">
            <label className={labelClass}>
              GitHub username
              <input name="username" className={inputClass} defaultValue={githubConfig.username ?? ""} placeholder="spenchh" autoComplete="off" required />
            </label>
            <FriendlyError error={github?.lastError} provider="GitHub" />
            <SubmitButton>Sync public GitHub</SubmitButton>
          </form>
          {setup.github.configured ? (
            <form action="/api/integrations/github/connect" method="get" className="mt-4 border-t border-[var(--line)] pt-4">
              <p className="text-sm text-[var(--muted)]">For private repositories, use GitHub&apos;s consent screen.</p>
              <button type="submit" className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5">Sign in with GitHub</button>
            </form>
          ) : (
            <SetupNotice
              title="Private GitHub sign-in is not ready yet"
              body="The public sync above works without tokens. Private repositories need a GitHub OAuth app configured by the app owner before provider sign-in can work."
            />
          )}
        </Panel>

        <ImportPanel source="syllabus" title="Syllabus or class notes" placeholder={"Paste assignment lines, deadlines, exam dates, or class project requirements.\nExample: ECE lab report due 6/12; final project demo 6/20"} />
        <ImportPanel source="simplify" title="Simplify tracker" placeholder={"Paste rows, notes, or exported tracker text from Simplify.\nExample: Company, role, deadline, status, next step"} />
        <ImportPanel source="handshake" title="Handshake opportunities" placeholder={"Paste saved jobs, career fair notes, recruiter messages, or event deadlines from Handshake."} />

        <Panel>
          <ConnectionHeader title="Calendar" status={calendarStatus(integrations)} syncedAt={calendarIcs?.lastSyncedAt ?? integrations.get("google_calendar")?.lastSyncedAt ?? integrations.get("outlook")?.lastSyncedAt ?? null} />
          <p className="mt-2 text-sm text-stone-700">Import your schedule without waiting on Google or Microsoft app setup. Momentum turns upcoming events into realistic commitments for the daily plan.</p>
          <form action={importCalendarFeedAction} className="mt-4 grid gap-4">
            <label className={labelClass}>
              Calendar name
              <input name="sourceName" className={inputClass} defaultValue={calendarConfig.sourceName ?? "My calendar"} placeholder="Northwestern schedule" />
            </label>
            <label className={labelClass}>
              iCal / ICS URL
              <input name="calendarUrl" className={inputClass} placeholder="https://calendar.google.com/calendar/ical/..." inputMode="url" />
              <span className="text-xs font-normal text-[var(--muted)]">Use a calendar export/share link. Momentum imports the events and does not store this URL.</span>
            </label>
            <label className={labelClass}>
              Or paste .ics export text
              <textarea name="calendarText" className={inputClass} rows={5} placeholder={"BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:ECE office hours\nDTSTART:20260605T190000Z\nEND:VEVENT\nEND:VCALENDAR"} />
            </label>
            <FriendlyError error={calendarIcs?.lastError} provider="Calendar" />
            <SubmitButton>Import calendar events</SubmitButton>
          </form>

          <div className="mt-5 border-t border-[var(--line)] pt-4">
            <p className="text-sm font-medium">Optional direct sign-in</p>
            <p className="mt-1 text-sm text-[var(--muted)]">These are cleaner when configured, but the import above is the working path right now.</p>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            <ProviderLoginAction
              title="Google Calendar"
              body="Uses Google's consent screen; no password is handled by Momentum."
              configured={setup.google.configured}
              action="/api/integrations/google_calendar/connect"
              buttonLabel="Sign in with Google"
              setupBody="Google Calendar needs an OAuth app configured before provider sign-in can work."
            />
            <ProviderLoginAction
              title="Outlook / Microsoft 365"
              body="Uses Microsoft sign-in and delegated calendar permission."
              configured={setup.outlook.configured}
              action="/api/integrations/outlook/connect"
              buttonLabel="Sign in with Microsoft"
              setupBody="Microsoft Calendar needs an Azure app registration configured before provider sign-in can work."
            />
          </div>
        </Panel>
      </div>
    </>
  );
}

function ConnectionHeader({ title, status, syncedAt }: { title: string; status: string; syncedAt?: Date | null }) {
  const tone = status === "connected" ? "good" : status === "error" ? "bad" : status === "needs_setup" ? "warn" : status === "needs_oauth" ? "info" : "neutral";
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

function FriendlyError({ error, provider }: { error?: string | null; provider: string }) {
  const message = friendlyLastError(error, provider);
  if (!message) return null;
  return <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{message}</p>;
}

function SetupNotice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-4 rounded-lg bg-[var(--surface-soft)] p-4 text-sm">
      <p className="font-medium text-[var(--foreground)]">{title}</p>
      <p className="mt-1 text-[var(--muted)]">{body}</p>
    </div>
  );
}

function ProviderLoginAction({
  title,
  body,
  configured,
  action,
  buttonLabel,
  setupBody,
}: {
  title: string;
  body: string;
  configured: boolean;
  action: string;
  buttonLabel: string;
  setupBody: string;
}) {
  return (
    <div className="rounded-lg bg-[var(--surface-soft)] p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{body}</p>
      {configured ? (
        <form action={action} method="get">
          <button type="submit" className="mt-3 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm font-medium shadow-sm transition hover:-translate-y-0.5">
            {buttonLabel}
          </button>
        </form>
      ) : (
        <p className="mt-3 text-sm text-amber-800">{setupBody}</p>
      )}
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

function calendarStatus(integrations: Map<string, { status: string }>) {
  const calendar = integrations.get("calendar_ics")?.status;
  if (calendar === "connected") return "connected";
  if (calendar === "error") return "error";
  const google = integrations.get("google_calendar")?.status;
  const outlook = integrations.get("outlook")?.status;
  if (google === "connected" || outlook === "connected") return "connected";
  if (google === "needs_setup" || outlook === "needs_setup") return "needs_setup";
  if (google === "needs_oauth" || outlook === "needs_oauth") return "needs_oauth";
  return "not_connected";
}

function friendlyLastError(error: string | null | undefined, provider: string) {
  if (!error) return null;
  if (/[A-Z0-9]+_CLIENT_(ID|SECRET)/.test(error) || error.toLowerCase().includes("oauth credentials")) {
    return `${provider} sign-in is not configured yet. Use the available public sync or paste import option for now.`;
  }
  return error;
}
