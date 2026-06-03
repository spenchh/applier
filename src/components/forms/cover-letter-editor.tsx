"use client";

import { useActionState, useState } from "react";
import { Save } from "lucide-react";
import { updateCoverLetterAction, type ActionState } from "@/lib/actions/application-actions";
import { Textarea } from "@/components/ui/textarea";
import { SubmitButton } from "@/components/submit-button";
import { CopyButton } from "@/components/copy-button";

const initial: ActionState = { ok: false };

export function CoverLetterEditor({
  applicationId,
  text,
  factChips,
}: {
  applicationId: string;
  text: string;
  factChips: React.ReactNode;
}) {
  const [value, setValue] = useState(text);
  const [state, action] = useActionState(updateCoverLetterAction, initial);

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <Textarea name="text" rows={12} value={value} onChange={(e) => setValue(e.target.value)} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        {factChips}
        <div className="flex items-center gap-2">
          <CopyButton value={value} label="Copy letter" />
          <SubmitButton size="sm" variant="outline" pendingText="Saving…">
            <Save className="size-4" /> Save
          </SubmitButton>
        </div>
      </div>
      {state.ok && state.message ? <p className="text-xs text-success">{state.message}</p> : null}
    </form>
  );
}
