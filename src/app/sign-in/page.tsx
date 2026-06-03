import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/sign-in-form";
import { PageHeader, Panel } from "@/components/ui";
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
        <SignInForm next={next || "/"} />
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
