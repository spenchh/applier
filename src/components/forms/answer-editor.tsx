"use client";

import { useActionState, useState } from "react";
import { Save, Check } from "lucide-react";
import { updateAnswerAction, type ActionState } from "@/lib/actions/application-actions";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { TruthBadge, ConfidenceBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { useFormStatus } from "react-dom";

const initial: ActionState = { ok: false };

function SaveBtn({ dirty }: { dirty: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" variant="outline" disabled={pending}>
      {pending ? <Check className="size-4" /> : <Save className="size-4" />}
      {pending ? "Saving…" : dirty ? "Save edit" : "Save"}
    </Button>
  );
}

export function AnswerEditor({
  answerId,
  applicationId,
  questionLabel,
  answerText,
  truthStatus,
  confidence,
  sensitive,
  needsUserInput,
  factChips,
  approved,
}: {
  answerId: string;
  applicationId: string;
  questionLabel: string;
  answerText: string;
  truthStatus: string;
  confidence?: string | null;
  sensitive: boolean;
  needsUserInput: boolean;
  factChips: React.ReactNode;
  approved: boolean;
}) {
  const [value, setValue] = useState(answerText);
  const [state, action] = useActionState(updateAnswerAction, initial);
  const dirty = value !== answerText;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <p className="text-sm font-medium">{questionLabel}</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <TruthBadge status={truthStatus} />
          <ConfidenceBadge confidence={confidence} />
          {approved ? <Badge variant="success">Approved</Badge> : null}
        </div>
      </div>

      {sensitive ? (
        <p className="mb-2 rounded-md bg-warning/10 p-2 text-xs text-warning">
          Sensitive question. InternPilot will not auto-submit this — confirm or provide your own answer per
          application. Voluntary self-identification is never required.
        </p>
      ) : null}
      {needsUserInput && !sensitive ? (
        <p className="mb-2 rounded-md bg-warning/10 p-2 text-xs text-warning">
          Needs your input — there isn&apos;t enough in your Truth Vault to answer this confidently. Edit it yourself.
        </p>
      ) : null}

      <form action={action} className="space-y-2">
        <input type="hidden" name="answerId" value={answerId} />
        <input type="hidden" name="applicationId" value={applicationId} />
        <Textarea
          name="answerText"
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={needsUserInput ? "Write your answer…" : ""}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {factChips}
          <div className="flex items-center gap-2">
            <CopyButton value={value} />
            <SaveBtn dirty={dirty} />
          </div>
        </div>
        {state.ok && state.message ? <p className="text-xs text-success">{state.message}</p> : null}
      </form>
    </div>
  );
}
