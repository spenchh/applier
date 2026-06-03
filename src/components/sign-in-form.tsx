"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { inputClass, labelClass } from "@/components/ui";

export function SignInForm({ next }: { next: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [email, setEmail] = useState(() => (typeof window === "undefined" ? "" : window.localStorage.getItem("momentum:remembered-email") ?? ""));
  const [remember, setRemember] = useState(true);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/sign-in", {
      method: "POST",
      body: formData,
      credentials: "same-origin",
    });
    setPending(false);

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(payload?.error ?? "That email and password do not match an account. Please try again.");
      return;
    }

    const submittedEmail = String(formData.get("email") ?? "");
    if (remember) window.localStorage.setItem("momentum:remembered-email", submittedEmail);
    else window.localStorage.removeItem("momentum:remembered-email");
    window.location.assign(next);
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <input type="hidden" name="next" value={next} />
      {error ? (
        <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-800 shadow-sm">
          {error}
        </div>
      ) : null}
      <label className={labelClass}>
        Email
        <input name="email" className={inputClass} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
      </label>
      <label className={labelClass}>
        Password
        <input name="password" className={inputClass} type="password" autoComplete="current-password" required />
      </label>
      <label className="flex items-center gap-2 text-sm text-stone-700">
        <input name="remember" type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} className="h-4 w-4 rounded border-[var(--line)]" />
        Remember this device for 90 days
      </label>
      <button
        type="submit"
        disabled={pending}
        className="liquid-button inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : null}
        Sign in
      </button>
    </form>
  );
}
