"use client";

import { useRef } from "react";
import { setStatusAction } from "@/lib/actions/application-actions";
import { Select } from "@/components/ui/select";
import { APPLICATION_STATUSES, STATUS_LABELS } from "@/lib/constants";

export function StatusSelect({ applicationId, status }: { applicationId: string; status: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form action={setStatusAction} ref={formRef}>
      <input type="hidden" name="applicationId" value={applicationId} />
      <Select
        name="status"
        defaultValue={status}
        className="h-8 text-xs"
        onChange={() => formRef.current?.requestSubmit()}
        aria-label="Change status"
      >
        {APPLICATION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </Select>
    </form>
  );
}
