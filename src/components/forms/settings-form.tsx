"use client";

import { useActionState } from "react";
import { CheckCircle2, AlertCircle, Lock } from "lucide-react";
import { saveSettingsAction, deleteAllDataAction, type ActionState } from "@/lib/actions/settings-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { SubmitButton } from "@/components/submit-button";
import { RESUME_BASE_TYPES } from "@/lib/constants";
import { humanize } from "@/lib/utils";
import type { AppSettings } from "@prisma/client";

const initial: ActionState = { ok: false };

export function SettingsForm({
  settings,
  providerStatus,
}: {
  settings: AppSettings;
  providerStatus: { anthropic: boolean; openai: boolean };
}) {
  const [state, action] = useActionState(saveSettingsAction, initial);

  return (
    <form action={action} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>LLM provider</CardTitle>
          <CardDescription>
            Choose the engine for analysis and tailoring. <strong>Mock</strong> runs fully offline with no API key.
            API keys are read from environment variables only — never entered or stored here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="llmProvider">Provider</Label>
              <Select id="llmProvider" name="llmProvider" defaultValue={settings.llmProvider}>
                <option value="mock">Mock (offline, no key)</option>
                <option value="anthropic">Anthropic</option>
                <option value="openai">OpenAI</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="defaultResumeTemplate">Default resume template</Label>
              <Select id="defaultResumeTemplate" name="defaultResumeTemplate" defaultValue={settings.defaultResumeTemplate}>
                {RESUME_BASE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {humanize(t)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant={providerStatus.anthropic ? "success" : "muted"}>
              ANTHROPIC_API_KEY {providerStatus.anthropic ? "configured" : "not set"}
            </Badge>
            <Badge variant={providerStatus.openai ? "success" : "muted"}>
              OPENAI_API_KEY {providerStatus.openai ? "configured" : "not set"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            If you select a provider without its key configured, InternPilot safely falls back to Mock.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Compliance &amp; quality controls</CardTitle>
          <CardDescription>Guardrails that keep this a human-in-the-loop assistant.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-md border bg-muted/40 p-3">
            <Lock className="mt-0.5 size-4 shrink-0 text-success" />
            <div className="text-sm">
              <div className="font-medium">Require review before submission — always on</div>
              <p className="text-muted-foreground">
                This cannot be disabled. Every application needs your explicit approval and an accuracy confirmation.
              </p>
            </div>
          </div>

          <label className="flex items-start gap-2.5 rounded-md border p-3">
            <Checkbox name="submissionAdaptersDisabled" defaultChecked={settings.submissionAdaptersDisabled} className="mt-0.5" />
            <span className="text-sm">
              <span className="font-medium">Disable all submission adapters</span>
              <p className="text-muted-foreground">
                When on, official ATS adapters never submit — everything falls back to Manual Mode. Recommended unless
                you&apos;ve configured and authorized a specific adapter.
              </p>
            </span>
          </label>

          <div className="space-y-1.5 sm:max-w-xs">
            <Label htmlFor="maxApplicationsPerDay">Max applications per day (quality control)</Label>
            <Input
              id="maxApplicationsPerDay"
              name="maxApplicationsPerDay"
              type="number"
              min={1}
              max={100}
              defaultValue={settings.maxApplicationsPerDay}
            />
            <p className="text-xs text-muted-foreground">A soft reminder to stay tailored — never a hard auto-apply cap.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
        {state.error ? (
          <span className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="size-4" /> {state.error}
          </span>
        ) : null}
        {state.ok && state.message ? (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4" /> {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}

export function DangerZone() {
  const [state, action] = useActionState(deleteAllDataAction, initial);
  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
        <CardDescription>Delete all profile, facts, jobs, and applications. This cannot be undone.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="confirm">Type DELETE to confirm</Label>
            <Input id="confirm" name="confirm" placeholder="DELETE" className="sm:w-48" />
          </div>
          <SubmitButton variant="destructive" pendingText="Deleting…">
            Delete all data
          </SubmitButton>
          {state.error ? (
            <span className="flex items-center gap-1.5 text-sm text-destructive">
              <AlertCircle className="size-4" /> {state.error}
            </span>
          ) : null}
          {state.ok && state.message ? (
            <span className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="size-4" /> {state.message}
            </span>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
