"use client";

import { useTransition } from "react";
import { updateStatusAction } from "@/app/actions";

const statuses = [
  "saved",
  "needs info",
  "drafted",
  "ready for review",
  "approved",
  "submitted",
  "online assessment",
  "interview scheduled",
  "interview completed",
  "offer",
  "rejected",
  "withdrawn",
  "archived",
];

export function StatusSelect({ applicationId, value }: { applicationId: string; value: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      defaultValue={value}
      disabled={pending}
      className="rounded-md border border-[var(--line)] bg-white px-2 py-1 text-sm"
      onChange={(event) => {
        const status = event.target.value;
        startTransition(async () => {
          await updateStatusAction(applicationId, status);
        });
      }}
    >
      {statuses.map((status) => (
        <option key={status} value={status}>
          {status}
        </option>
      ))}
    </select>
  );
}
