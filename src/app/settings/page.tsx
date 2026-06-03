import Link from "next/link";
import { updateSettingsAction } from "@/app/actions";
import { DeleteDataForm } from "@/components/delete-data-form";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader, Panel, inputClass, labelClass } from "@/components/ui";
import { getAIWrapperStatus, safeProviderName } from "@/lib/ai-wrapper";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/services/settings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireUser("/settings");
  const settings = await getSettings();
  const aiStatus = getAIWrapperStatus({
    provider: safeProviderName(settings.llmProvider),
    model: settings.aiModel,
    instructions: settings.aiInstructions,
  });

  return (
    <>
      <PageHeader title="Settings" eyebrow="Coach, privacy, and data" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <h2 className="text-lg font-semibold">AI coach</h2>
          <div className="mt-4 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-3 text-sm text-stone-700">
            <p className="font-medium">Current mode: {aiStatus.mode === "local_mock" ? "Local planning engine" : aiStatus.effectiveProvider}</p>
            <p>Provider: {aiStatus.provider}</p>
            <p>Model: {aiStatus.model}</p>
            {aiStatus.warning ? <p className="mt-2 text-amber-700">{aiStatus.warning}</p> : null}
          </div>
          <form action={updateSettingsAction} className="mt-4 grid gap-4">
            <label className={labelClass}>
              LLM provider
              <select name="llmProvider" className={inputClass} defaultValue={settings.llmProvider}>
                <option value="mock">Local mock</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
              </select>
            </label>
            <label className={labelClass}>
              Model
              <input name="aiModel" className={inputClass} defaultValue={settings.aiModel ?? ""} placeholder="mock, gpt-4.1, claude-sonnet..." />
            </label>
            <label className={labelClass}>
              Coach instructions
              <textarea
                name="aiInstructions"
                className={inputClass}
                rows={5}
                defaultValue={settings.aiInstructions ?? ""}
                placeholder="Example: Be direct, keep plans realistic, bias toward school deadlines before career tasks during exam weeks."
              />
            </label>
            <input type="hidden" name="defaultResumeTemplate" value={settings.defaultResumeTemplate} />
            <input type="hidden" name="targetRoleTypes" value="" />
            <input type="hidden" name="targetIndustries" value="" />
            <input type="hidden" name="excludedKeywords" value="" />
            <input type="hidden" name="maxApplicationsPerDay" value={settings.maxApplicationsPerDay} />
            <SubmitButton>Save coach settings</SubmitButton>
          </form>
        </Panel>

        <Panel>
          <h2 className="text-lg font-semibold">Connector privacy</h2>
          <div className="mt-4 grid gap-3 text-sm text-stone-700">
            <p>Connections use provider sign-in and OAuth consent. Momentum never asks for your GitHub, Google, Microsoft, or Canvas password.</p>
            <p>Provider access tokens are used during the sync callback and are not stored long-term by default. Reconnect when you want to refresh data.</p>
            <p>Calendar import works without OAuth through an iCal/ICS URL or pasted calendar export. Momentum imports the events and does not store the calendar URL.</p>
            <p>Public GitHub sync works by username. Private GitHub repositories, Google Calendar, Outlook, and Canvas require app owner OAuth credentials in Vercel before provider sign-in can complete.</p>
            <p>Simplify and Handshake are handled through paste/import workflows because that is safer and more reliable than scraping.</p>
            <p>Database: SQLite through `DATABASE_URL`; on Vercel fallback storage is `/tmp`, so use a managed database before depending on this for long-term production data.</p>
          </div>
          <div className="mt-5">
            <DeleteDataForm />
          </div>
        </Panel>

        <Panel className="xl:col-span-2">
          <h2 className="text-lg font-semibold">Legacy application tools</h2>
          <p className="mt-2 text-sm text-stone-700">
            InternPilot pages are no longer the main product, but they are still available by URL while we transition:{" "}
            <Link className="font-medium text-emerald-700" href="/jobs">Job Inbox</Link>,{" "}
            <Link className="font-medium text-emerald-700" href="/resumes">Resumes</Link>,{" "}
            <Link className="font-medium text-emerald-700" href="/applications/review">Review Queue</Link>.
          </p>
        </Panel>
      </div>
    </>
  );
}
