import { updateSettingsAction } from "@/app/actions";
import { DeleteDataForm } from "@/components/delete-data-form";
import { SubmitButton } from "@/components/submit-button";
import { ButtonLink, PageHeader, Panel, inputClass, labelClass } from "@/components/ui";
import { getAIWrapperStatus, safeProviderName } from "@/lib/ai-wrapper";
import { requireUser } from "@/lib/auth";
import { toList } from "@/lib/json";
import { getSettings } from "@/lib/services/settings";
import { roleCategories, roleCategoryLabel } from "@/lib/text";

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
      <PageHeader title="Settings" eyebrow="Provider and privacy controls" action={<ButtonLink href="/api/export/data.json" tone="secondary">Export data</ButtonLink>} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Panel>
          <h2 className="mb-4 text-lg font-semibold">AI wrapper</h2>
          <div className="mb-4 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-3 text-sm text-stone-700">
            <p className="font-medium">Current mode: {aiStatus.mode === "local_mock" ? "Local mock" : aiStatus.effectiveProvider}</p>
            <p>Selected provider: {aiStatus.provider}</p>
            <p>Model: {aiStatus.model}</p>
            {aiStatus.warning ? <p className="mt-2 text-amber-700">{aiStatus.warning}</p> : null}
          </div>
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
              Model
              <input name="aiModel" className={inputClass} defaultValue={settings.aiModel ?? ""} placeholder="mock, gpt-4.1, claude-sonnet..." />
            </label>
            <label className={labelClass}>
              AI instructions
              <textarea
                name="aiInstructions"
                className={inputClass}
                rows={4}
                defaultValue={settings.aiInstructions ?? ""}
                placeholder="Optional tone or formatting preferences. Truth Vault facts remain the only allowed source for claims."
              />
            </label>
            <label className={labelClass}>
              Default resume template
              <select name="defaultResumeTemplate" className={inputClass} defaultValue={settings.defaultResumeTemplate}>
                <option value="software_engineering">Software engineering</option>
                <option value="data_science">Data science</option>
                <option value="product_management">Product management</option>
                <option value="design_ux">Design / UX</option>
                <option value="marketing">Marketing</option>
                <option value="finance">Finance</option>
                <option value="consulting">Consulting</option>
                <option value="research">Research</option>
                <option value="operations">Operations</option>
                <option value="general_internship">General internship</option>
              </select>
            </label>
            <label className={labelClass}>
              Target role families
              <input
                name="targetRoleTypes"
                className={inputClass}
                defaultValue={toList(settings.targetRoleTypes).join(", ")}
                placeholder={roleCategories.map(roleCategoryLabel).slice(0, 5).join(", ")}
              />
            </label>
            <label className={labelClass}>
              Target industries
              <input name="targetIndustries" className={inputClass} defaultValue={toList(settings.targetIndustries).join(", ")} placeholder="Healthcare, climate, media, finance" />
            </label>
            <label className={labelClass}>
              Excluded keywords
              <input name="excludedKeywords" className={inputClass} defaultValue={toList(settings.excludedKeywords).join(", ")} placeholder="unpaid, door-to-door, commission-only" />
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
            <p>Seed data is blank by default. Optional demo data requires `SEED_DEMO=true npm run db:seed`.</p>
          </div>
          <div className="mt-5">
            <DeleteDataForm />
          </div>
        </Panel>
      </div>
    </>
  );
}
