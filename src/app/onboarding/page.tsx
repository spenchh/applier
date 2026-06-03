import { ProfileForm } from "@/components/profile-form";
import { PageHeader, Panel } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { getPrimaryProfile } from "@/lib/services/profile";
import { toList } from "@/lib/json";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireUser("/onboarding");
  const profile = await getPrimaryProfile(user.id);
  return (
    <>
      <PageHeader title="Onboarding" eyebrow="Profile basics" />
      <Panel>
        <ProfileForm
          defaults={{
            legalName: profile?.legalName ?? "",
            preferredName: profile?.preferredName ?? "",
            email: profile?.email ?? "",
            phone: profile?.phone ?? "",
            location: profile?.location ?? "",
            school: profile?.school ?? "",
            degree: profile?.degree ?? "",
            major: profile?.major ?? "",
            minor: profile?.minor ?? "",
            graduationDate: toDateInput(profile?.graduationDate),
            gpa: profile?.gpa ?? "",
            workAuthorization: profile?.workAuthorization ?? "",
            sponsorshipRequired: profile?.sponsorshipRequired ?? false,
            earliestStartDate: toDateInput(profile?.earliestStartDate),
            preferredTerms: toList(profile?.preferredTerms).join(", "),
            preferredLocations: toList(profile?.preferredLocations).join(", "),
            remotePreference: profile?.remotePreference ?? "",
            portfolioUrl: profile?.portfolioUrl ?? "",
            githubUrl: profile?.githubUrl ?? "",
            linkedinUrl: profile?.linkedinUrl ?? "",
            websiteUrl: profile?.websiteUrl ?? "",
          }}
        />
      </Panel>
    </>
  );
}

function toDateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}
