"use client";

import { deleteAllDataAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";

export function DeleteDataForm() {
  return (
    <form
      action={deleteAllDataAction}
      onSubmit={(event) => {
        if (!window.confirm("Delete all Momentum app data? This cannot be undone.")) {
          event.preventDefault();
        }
      }}
    >
      <SubmitButton tone="danger">Delete local app data</SubmitButton>
    </form>
  );
}
