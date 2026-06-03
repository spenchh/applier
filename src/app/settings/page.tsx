import { updateSettingsAction } from "@/app/actions";
import { DeleteDataForm } from "@/components/delete-data-form";
import { SubmitButton } from "@/components/submit-button";
import { ButtonLink, PageHeader, Panel, inputClass, labelClass } from "@/components/ui";
import { getSettings } from "@/lib/services/settings";

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <PageHeader title="Settings" eyebrow="Provider and privacy controls" action={<ButtonLink href="/api/export/data.json" tone="secondary">Export data</ButtonLink>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <h2 className="mb-4 text-lg font-semibold">Application settings</h2>
          <form action={updateSettingsAction} className="grid gap-4">
            <label className={labelClass}>
              LLM provider
              <select name="llmProvider" className={inputClass} defaultValue={settings.llmProvider}>
                <option value="mock">Mock</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
              </select>
            </label>
            <label className={labelClass}>
              Default resume template
              <select name="defaultResumeTemplate" className={inputClass} defaultValue={settings.defaultResumeTemplate}>
                <option value="software_engineering">Software engineering</option>
                <option value="data_science">Data science</option>
                <option value="product_management">Product management</option>
                <option value="general_internship">General internship</option>
              </select>
            </label>
            <label className={labelClass}>
              Max applications per day
              <input name="maxApplicationsPerDay" className={inputClass} type="number" min={1} max={50} defaultValue={settings.maxApplicationsPerDay} />
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input name="disableSubmissionAdapters" type="checkbox" defaultChecked={settings.disableSubmissionAdapters} />
              Disable all submission adapters
            </label>
            <label className="flex items-center gap-2 text-sm text-stone-600">
              <input type="checkbox" checked readOnly />
              Require review before submission
            </label>
            <SubmitButton>Save settings</SubmitButton>
          </form>
        </Panel>

        <Panel>
          <h2 className="mb-4 text-lg font-semibold">Data controls</h2>
          <div className="grid gap-3 text-sm text-stone-700">
            <p>Local database: SQLite via `DATABASE_URL`.</p>
            <p>Generated files: local `/storage` directory when export integrations are added.</p>
            <p>Secrets: environment variables only.</p>
          </div>
          <div className="mt-5">
            <DeleteDataForm />
          </div>
        </Panel>
      </div>
    </>
  );
}
