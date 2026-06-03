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
    <div className="mb-8 flex flex-col gap-4 border-b border-[var(--line)] pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">{eyebrow}</p> : null}
        <h1 className="mt-1 text-3xl font-semibold tracking-normal text-[var(--foreground)]">{title}</h1>
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
          ? "liquid-button inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm"
          : "inline-flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--foreground)] shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--surface-soft)]"
      }
    >
      {children}
    </Link>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel-surface rounded-lg border border-[var(--line)] p-6 ${className}`}>{children}</section>;
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info" }) {
  const styles = {
    neutral: "bg-stone-100 text-stone-700 border-stone-200",
    good: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warn: "bg-orange-50 text-orange-800 border-orange-200",
    bad: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-indigo-50 text-indigo-700 border-indigo-200",
  };
  return <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${styles[tone]}`}>{children}</span>;
}

export function Score({ value }: { value: number }) {
  const tone = value >= 75 ? "bg-[var(--brand)]" : value >= 45 ? "bg-[var(--accent-warm)]" : "bg-rose-500";
  return (
    <div className="flex items-center gap-3">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-stone-200/80">
        <div className={`h-full ${tone}`} style={{ width: `${Math.max(4, Math.min(100, value))}%` }} />
      </div>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="panel-surface rounded-lg border border-dashed border-[var(--line)] p-8 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--muted)]">{body}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export const inputClass =
  "w-full rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none ring-[var(--focus)] transition hover:border-stone-300 focus:border-[var(--brand)] focus:ring-4";

export const labelClass = "grid gap-1.5 text-sm font-medium text-[var(--foreground)]";
