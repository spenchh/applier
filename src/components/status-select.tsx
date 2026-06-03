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
      className="rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm outline-none ring-[var(--focus)] transition focus:border-[var(--brand)] focus:ring-4"
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
