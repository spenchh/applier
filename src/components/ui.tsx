import Link from "next/link";
import type { ReactNode } from "react";

export function PageHeader({
  title,
  eyebrow,
  action,
}: {
  title: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[#1d211f]">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function ButtonLink({ href, children, tone = "primary" }: { href: string; children: ReactNode; tone?: "primary" | "secondary" }) {
  return (
    <Link
      href={href}
      className={
        tone === "primary"
          ? "inline-flex items-center justify-center rounded-md bg-[#17473a] px-4 py-2 text-sm font-medium text-white hover:bg-[#11352c]"
          : "inline-flex items-center justify-center rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm font-medium text-[#1d211f] hover:bg-[#f0f0ea]"
      }
    >
      {children}
    </Link>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm ${className}`}>{children}</section>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info" }) {
  const styles = {
    neutral: "bg-stone-100 text-stone-700 border-stone-200",
    good: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-amber-50 text-amber-800 border-amber-200",
    bad: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
  };
  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-medium ${styles[tone]}`}>{children}</span>;
}

export function Score({ value }: { value: number }) {
  const tone = value >= 75 ? "bg-emerald-600" : value >= 45 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-stone-200">
        <div className={`h-full ${tone}`} style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
      </div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-[var(--line)] bg-white p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--muted)]">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none ring-emerald-200 transition focus:border-emerald-600 focus:ring-4";

export const labelClass = "grid gap-1 text-sm font-medium text-[#1d211f]";
