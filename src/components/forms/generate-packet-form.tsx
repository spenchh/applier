"use client";

import { useActionState } from "react";
import { Wand2, AlertCircle, CheckCircle2 } from "lucide-react";
import { generatePacketAction, type ActionState } from "@/lib/actions/application-actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/submit-button";

const initial: ActionState = { ok: false };

export function GeneratePacketForm({ applicationId, regenerate }: { applicationId: string; regenerate?: boolean }) {
  const [state, action] = useActionState(generatePacketAction, initial);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <label className="flex items-center gap-2 text-sm">
        <Checkbox name="includeCoverLetter" defaultChecked value="on" /> Include cover letter
      </label>
      <SubmitButton pendingText="Generating…" variant={regenerate ? "outline" : "default"}>
        <Wand2 className="size-4" /> {regenerate ? "Regenerate packet" : "Generate application packet"}
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
  );
}
