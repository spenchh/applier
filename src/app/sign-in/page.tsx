import Link from "next/link";
import { redirect } from "next/navigation";
import { signInAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader, Panel, inputClass, labelClass } from "@/components/ui";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await currentUser();
  if (user) redirect("/");
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Sign in" eyebrow="InternPilot account" />
      <Panel>
        <form action={signInAction} className="grid gap-4">
          <input type="hidden" name="next" value={next || "/"} />
          <label className={labelClass}>
            Email
            <input name="email" className={inputClass} type="email" autoComplete="email" required />
          </label>
          <label className={labelClass}>
            Password
            <input name="password" className={inputClass} type="password" autoComplete="current-password" required />
          </label>
          <SubmitButton>Sign in</SubmitButton>
        </form>
        <p className="mt-4 text-sm text-[var(--muted)]">
          New here?{" "}
          <Link className="font-medium text-emerald-700" href={`/sign-up${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
            Create an account
          </Link>
        </p>
      </Panel>
    </div>
  );
}
