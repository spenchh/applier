"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { submitApplicationAction, setModeAction, type ActionState } from "@/lib/actions/application-actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

const initial: ActionState = { ok: false };

export function ModeSelector({ applicationId, mode, emailAvailable }: { applicationId: string; mode: string; emailAvailable: boolean }) {
  return (
    <form action={setModeAction} className="flex items-end gap-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="mode">Submission mode</Label>
        <Select id="mode" name="mode" defaultValue={mode}>
          <option value="manual">Manual Mode (copy &amp; apply on the site)</option>
          {emailAvailable ? <option value="email">Email Mode (draft email)</option> : null}
          <option value="adapter">Official Adapter (requires configured API key)</option>
        </Select>
      </div>
      <SubmitButton size="sm" variant="outline" pendingText="…">
        Set mode
      </SubmitButton>
    </form>
  );
}

export function SubmitForm({
  applicationId,
  approved,
  mode,
}: {
  applicationId: string;
  approved: boolean;
  mode: string;
}) {
  const [state, action] = useActionState(submitApplicationAction, initial);
  const [checked, setChecked] = useState(false);

  const verb = mode === "email" ? "Draft / send email" : mode === "adapter" ? "Submit via adapter" : "Mark as submitted";

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="applicationId" value={applicationId} />

      <label className="flex items-start gap-2.5 rounded-md border bg-card p-3">
        <Checkbox
          name="confirmedAccurate"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-0.5"
          value="on"
        />
        <span className="text-sm">
          <strong>I reviewed this application and confirm the information is accurate.</strong> I understand
          InternPilot does not bypass any platform controls and will not submit anything I haven&apos;t approved.
        </span>
      </label>

      <SubmitButton variant="success" className="w-full" disabled={!approved || !checked} pendingText="Processing…">
        <Send className="size-4" /> {verb}
      </SubmitButton>

      {!approved ? (
        <p className="flex items-center gap-1.5 text-sm text-warning">
          <AlertCircle className="size-4" /> Approve the packet in the Tailoring Studio before submitting.
        </p>
      ) : null}

      {state.error ? (
        <p className="flex items-start gap-1.5 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 size-4 shrink-0" /> {state.error}
        </p>
      ) : null}
      {state.ok && state.message ? (
        <p className="flex items-start gap-1.5 rounded-md bg-success/10 p-2 text-sm text-success">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" /> {state.message}
        </p>
      ) : null}
    </form>
  );
}
