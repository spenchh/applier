import { Sparkles, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ProfileForm } from "@/components/forms/profile-form";
import { getOrCreateProfile } from "@/lib/services/profile-service";
import { decrypt } from "@/lib/encryption";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const profile = await getOrCreateProfile();
  return (
    <div>
      <PageHeader
        title="Onboarding"
        description="A few basics so InternPilot can tailor materials. Sensitive fields are optional — but anything you do enter must be accurate."
      />

      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" />
          <div className="space-y-1">
            <p>
              <strong className="text-foreground">How this works:</strong> we never invent facts. Legal and
              eligibility answers (work authorization, sponsorship, availability) are used only when a posting asks
              and you confirm them per application.
            </p>
            <p className="flex items-center gap-1.5">
              <ListChecks className="size-4" /> After this, add a few Truth Vault facts and paste a job to see the
              full flow.
            </p>
          </div>
        </CardContent>
      </Card>

      <ProfileForm
        profile={profile}
        redirectTo="/profile?tab=vault"
        decryptedPhone={decrypt(profile.phone) ?? ""}
        decryptedWorkAuth={decrypt(profile.workAuthorization) ?? ""}
      />
    </div>
  );
}
