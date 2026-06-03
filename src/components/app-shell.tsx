import { BarChart3, BriefcaseBusiness, ClipboardCheck, FileText, Home, Inbox, LogIn, LogOut, Search, Settings, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { currentUser } from "@/lib/auth";

const nav = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/onboarding", label: "Onboarding", icon: ShieldCheck },
  { href: "/profile", label: "Truth Vault", icon: UserRound },
  { href: "/resumes", label: "Resumes", icon: FileText },
  { href: "/discover", label: "Discover", icon: Search },
  { href: "/jobs", label: "Job Inbox", icon: Inbox },
  { href: "/applications/review", label: "Review Queue", icon: ClipboardCheck },
  { href: "/tracker", label: "Tracker", icon: BriefcaseBusiness },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <div className="app-shell min-h-screen bg-[var(--background)]">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-[var(--line)] bg-[#fbfbf8] px-4 py-5 lg:block">
        <Link href="/" className="flex items-center gap-2 px-2 text-xl font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-md bg-[#17473a] text-white">IP</span>
          InternPilot
        </Link>
        <nav className="mt-8 grid gap-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-[#ecece4] hover:text-[#1d211f]">
                <Icon className="h-4 w-4" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-4 bottom-5 rounded-md border border-[var(--line)] bg-white p-3 text-sm">
          {user ? (
            <div className="grid gap-3">
              <div>
                <p className="font-medium">{user.displayName || user.email}</p>
                <p className="truncate text-xs text-[var(--muted)]">{user.email}</p>
              </div>
              <form action={signOutAction}>
                <button type="submit" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-medium text-stone-700 hover:bg-[#ecece4]">
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sign out
                </button>
              </form>
            </div>
          ) : (
            <Link href="/sign-in" className="flex items-center gap-2 rounded-md px-2 py-1.5 font-medium text-stone-700 hover:bg-[#ecece4]">
              <LogIn className="h-4 w-4" aria-hidden />
              Sign in
            </Link>
          )}
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-[#fbfbf8]/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" className="font-semibold">
              InternPilot
            </Link>
            {user ? (
              <form action={signOutAction}>
                <button type="submit" className="text-sm font-medium text-stone-700">Sign out</button>
              </form>
            ) : (
              <Link href="/sign-in" className="text-sm font-medium text-stone-700">Sign in</Link>
            )}
          </div>
        </header>
        <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
