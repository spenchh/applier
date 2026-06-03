"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";

export function SubmitButton({ children, tone = "primary" }: { children: React.ReactNode; tone?: "primary" | "secondary" | "danger" }) {
  const { pending } = useFormStatus();
  const styles = {
    primary: "bg-[var(--brand)] text-white shadow-sm hover:bg-[var(--brand-hover)]",
    secondary: "border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] shadow-sm hover:bg-[var(--surface-soft)]",
    danger: "bg-rose-700 text-white hover:bg-rose-800",
  };
  return (
    <button
      type="submit"
      disabled={pending}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${styles[tone]}`}
    >
      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
