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
  const github = integrations.get("github");
  const calendarIcs = integrations.get("calendar_ics");
  const githubConfig = readJson<{ username?: string }>(github?.configJson, {});
  const calendarConfig = readJson<{ sourceName?: string }>(calendarIcs?.configJson, {});
  const setup = {
    github: oauthSetupStatus("github"),
    google: oauthSetupStatus("google_calendar"),
    outlook: oauthSetupStatus("outlook"),
  };

  return (
    <>
      <PageHeader title="Connections" eyebrow="Bring your real life into the plan" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel className="xl:col-span-2">
          <h2 className="text-lg font-semibold">What Momentum is actually for</h2>
          <p className="mt-2 max-w-3xl text-sm text-stone-700">
            It is not trying to be Simplify or a fake all-in-one portal. It pulls your real school, project, and career commitments into one place, then helps decide what needs attention today and what proof you are building over time.
          </p>
          <div className="mt-4 grid gap-3 text-sm text-stone-700 md:grid-cols-4">
            <p><strong className="text-[var(--foreground)]">Import commitments</strong><br />Canvas feeds, calendars, syllabi, trackers, notes.</p>
            <p><strong className="text-[var(--foreground)]">Make a daily plan</strong><br />Due dates, goals, and check-ins become a short queue.</p>
            <p><strong className="text-[var(--foreground)]">Keep proof</strong><br />Projects, GitHub work, and completed tasks become evidence.</p>
            <p><strong className="text-[var(--foreground)]">Stay honest</strong><br />See what slipped, what is stale, and what to do next.</p>
          </div>
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
              title="Public GitHub sync is the useful default"
              body="That is enough for most portfolio proof. Private repositories can be added later if you configure GitHub provider sign-in."
            />
          )}
        </Panel>

        <ImportPanel source="syllabus" title="Syllabus or class notes" placeholder={"Paste assignment lines, deadlines, exam dates, or class project requirements.\nExample: ECE lab report due 6/12; final project demo 6/20"} />
        <ImportPanel source="simplify" title="Simplify tracker" placeholder={"Paste rows, notes, or exported tracker text from Simplify.\nExample: Company, role, deadline, status, next step"} />
        <ImportPanel source="handshake" title="Handshake opportunities" placeholder={"Paste saved jobs, career fair notes, recruiter messages, or event deadlines from Handshake."} />

        <Panel className="xl:col-span-2">
          <ConnectionHeader title="Canvas + calendar feeds" status={calendarStatus(integrations)} syncedAt={calendarIcs?.lastSyncedAt ?? integrations.get("google_calendar")?.lastSyncedAt ?? integrations.get("outlook")?.lastSyncedAt ?? null} />
          <p className="mt-2 max-w-3xl text-sm text-stone-700">Paste a Canvas Calendar Feed, Google secret iCal address, Outlook published ICS link, or a `.ics` export. Momentum imports upcoming events and assignments into the daily plan without needing provider OAuth.</p>
          <div className="mt-4 grid gap-2 text-sm text-[var(--muted)] md:grid-cols-3">
            <p><strong className="text-[var(--foreground)]">Canvas:</strong> Calendar page, then Calendar Feed, then copy the feed URL.</p>
            <p><strong className="text-[var(--foreground)]">Google:</strong> Calendar settings, then Secret address in iCal format.</p>
            <p><strong className="text-[var(--foreground)]">Outlook:</strong> Publish calendar, then copy the ICS link.</p>
          </div>
          <form action={importCalendarFeedAction} className="mt-4 grid gap-4">
            <label className={labelClass}>
              Feed name
              <input name="sourceName" className={inputClass} defaultValue={calendarConfig.sourceName ?? "Canvas calendar"} placeholder="Canvas calendar" />
            </label>
            <label className={labelClass}>
              Feed URL
              <input name="calendarUrl" className={inputClass} placeholder="webcal://canvas.northwestern.edu/feeds/calendars/..." inputMode="url" />
              <span className="text-xs font-normal text-[var(--muted)]">Supports http, https, and webcal links. Momentum imports the events and does not store this URL.</span>
            </label>
            <label className={labelClass}>
              Or paste .ics export text
              <textarea name="calendarText" className={inputClass} rows={5} placeholder={"BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:ECE office hours\nDTSTART:20260605T190000Z\nEND:VEVENT\nEND:VCALENDAR"} />
            </label>
            <FriendlyError error={calendarIcs?.lastError} provider="Calendar" />
            <SubmitButton>Import calendar events</SubmitButton>
          </form>

          <details className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-[var(--muted)]">
            <summary className="cursor-pointer font-medium text-[var(--foreground)]">Optional direct provider sign-in</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <ProviderLoginAction
                title="Google Calendar"
                body="Uses Google's consent screen when app-owner OAuth setup exists."
                configured={setup.google.configured}
                action="/api/integrations/google_calendar/connect"
                buttonLabel="Sign in with Google"
                setupBody="Use the feed import above for now."
              />
              <ProviderLoginAction
                title="Outlook / Microsoft 365"
                body="Uses Microsoft sign-in when app-owner OAuth setup exists."
                configured={setup.outlook.configured}
                action="/api/integrations/outlook/connect"
                buttonLabel="Sign in with Microsoft"
                setupBody="Use the feed import above for now."
              />
            </div>
          </details>
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
