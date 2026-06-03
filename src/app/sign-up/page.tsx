import Link from "next/link";
import { redirect } from "next/navigation";
import { signUpAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { PageHeader, Panel, inputClass, labelClass } from "@/components/ui";
import { currentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const user = await currentUser();
  if (user) redirect("/");
  const { next } = await searchParams;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Create account" eyebrow="Save your accountability workspace" />
      <Panel>
        <form action={signUpAction} className="grid gap-4">
          <input type="hidden" name="next" value={next || "/"} />
          <label className={labelClass}>
            Name
            <input name="displayName" className={inputClass} autoComplete="name" />
          </label>
          <label className={labelClass}>
            Email
            <input name="email" className={inputClass} type="email" autoComplete="email" required />
          </label>
          <label className={labelClass}>
            Password
            <input name="password" className={inputClass} type="password" autoComplete="new-password" minLength={8} required />
          </label>
          <SubmitButton>Create account</SubmitButton>
        </form>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link className="font-medium text-emerald-700" href={`/sign-in${next ? `?next=${encodeURIComponent(next)}` : ""}`}>
            Sign in
          </Link>
        </p>
      </Panel>
    </div>
  );
}
