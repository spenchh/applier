import Link from "next/link";
import { Pencil, Trash2, ShieldCheck, BadgeCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ProfileForm } from "@/components/forms/profile-form";
import { FactForm } from "@/components/forms/fact-form";
import { getProfileWithFacts } from "@/lib/services/profile-service";
import { decrypt } from "@/lib/encryption";
import { deleteFactAction } from "@/lib/actions/profile-actions";
import { humanize, parseStringList, formatDate, cn } from "@/lib/utils";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; tab?: string }>;
}) {
  const { edit, tab } = await searchParams;
  const { profile, facts } = await getProfileWithFacts();
  const editFact = edit ? await db.profileFact.findUnique({ where: { id: edit } }) : null;

  const showProfile = tab !== "vault";

  return (
    <div>
      <PageHeader
        title="Profile & Truth Vault"
        description="Your verified facts are the single source of truth the AI may use. Nothing is invented — claims that don't map to a fact get flagged."
      >
        <Link
          href="/profile"
          className={cn(buttonVariants({ variant: showProfile ? "default" : "outline", size: "sm" }))}
        >
          Profile
        </Link>
        <Link
          href="/profile?tab=vault"
          className={cn(buttonVariants({ variant: !showProfile ? "default" : "outline", size: "sm" }))}
        >
          Truth Vault ({facts.length})
        </Link>
      </PageHeader>

      {showProfile ? (
        <ProfileForm
          profile={profile}
          decryptedPhone={decrypt(profile.phone) ?? ""}
          decryptedWorkAuth={decrypt(profile.workAuthorization) ?? ""}
        />
      ) : (
        <div className="space-y-6">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-start gap-3 p-4">
              <ShieldCheck className="mt-0.5 size-5 text-primary" />
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Claim verifier:</strong> when generating materials, every
                bullet and answer cites the facts it used. Any claim that cannot be traced back to a fact here is
                surfaced as <em>unsupported</em> so you can fix it before approving.
              </p>
            </CardContent>
          </Card>

          <FactForm fact={editFact} />

          <div className="space-y-3">
            <h2 className="text-lg font-semibold">Stored facts</h2>
            {facts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No facts yet. Add your first above.</p>
            ) : (
              <div className="grid gap-3">
                {facts.map((f) => (
                  <Card key={f.id}>
                    <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
                      <div>
                        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                          {f.title}
                          <Badge variant="secondary">{humanize(f.type)}</Badge>
                          {f.verified ? (
                            <Badge variant="success">
                              <BadgeCheck className="size-3" /> Verified
                            </Badge>
                          ) : null}
                        </CardTitle>
                        {f.organization || f.location ? (
                          <CardDescription>
                            {[f.organization, f.location].filter(Boolean).join(" · ")}
                            {f.startDate ? ` · ${formatDate(f.startDate)}${f.endDate ? ` – ${formatDate(f.endDate)}` : " – Present"}` : ""}
                          </CardDescription>
                        ) : null}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Link href={`/profile?tab=vault&edit=${f.id}#fact-form`} className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
                          <Pencil className="size-4" />
                        </Link>
                        <form action={deleteFactAction}>
                          <input type="hidden" name="id" value={f.id} />
                          <Button variant="ghost" size="icon" type="submit" aria-label="Delete fact">
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        </form>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {f.description ? <p className="text-sm">{f.description}</p> : null}
                      {f.impact ? <p className="text-sm text-muted-foreground">Impact: {f.impact}</p> : null}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {parseStringList(f.skills).map((s) => (
                          <Badge key={s} variant="outline">
                            {s}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-3 pt-1 text-xs text-muted-foreground">
                        <span>{f.resumeAllowed ? "✓" : "✕"} Resume</span>
                        <span>{f.coverLetterAllowed ? "✓" : "✕"} Cover letter</span>
                        <span>{f.answersAllowed ? "✓" : "✕"} Answers</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
