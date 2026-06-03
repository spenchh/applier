import { CheckCircle2 } from "lucide-react";
import { createFactAction } from "@/app/actions";
import { ProfileForm } from "@/components/profile-form";
import { SubmitButton } from "@/components/submit-button";
import { Badge, EmptyState, PageHeader, Panel, inputClass, labelClass } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { toList } from "@/lib/json";
import { getPrimaryProfile } from "@/lib/services/profile";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await requireUser("/profile");
  const profile = await getPrimaryProfile(user.id);

  return (
    <>
      <PageHeader title="Profile and Truth Vault" eyebrow="Verified source material" />
      {profile ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_.9fr]">
          <Panel>
            <h2 className="mb-4 text-lg font-semibold">Profile basics</h2>
            <ProfileForm
              defaults={{
                legalName: profile.legalName,
                preferredName: profile.preferredName ?? "",
                email: profile.email,
                phone: profile.phone ?? "",
                location: profile.location ?? "",
                school: profile.school ?? "",
                degree: profile.degree ?? "",
                major: profile.major ?? "",
                minor: profile.minor ?? "",
                graduationDate: toDateInput(profile.graduationDate),
                gpa: profile.gpa ?? "",
                workAuthorization: profile.workAuthorization ?? "",
                careerInterests: profile.careerInterests ?? "",
                sponsorshipRequired: profile.sponsorshipRequired,
                earliestStartDate: toDateInput(profile.earliestStartDate),
                preferredTerms: toList(profile.preferredTerms).join(", "),
                preferredLocations: toList(profile.preferredLocations).join(", "),
                remotePreference: profile.remotePreference ?? "",
                portfolioUrl: profile.portfolioUrl ?? "",
                githubUrl: profile.githubUrl ?? "",
                linkedinUrl: profile.linkedinUrl ?? "",
                websiteUrl: profile.websiteUrl ?? "",
              }}
            />
          </Panel>
          <Panel>
            <h2 className="mb-4 text-lg font-semibold">Add verified fact</h2>
            <form action={createFactAction} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className={labelClass}>
                  Type
                  <select name="type" className={inputClass} defaultValue="project">
                    <option value="project">Project</option>
                    <option value="internship">Internship</option>
                    <option value="education">Education</option>
                    <option value="leadership">Leadership</option>
                    <option value="coursework">Coursework</option>
                    <option value="award">Award</option>
                    <option value="skill">Skill</option>
                  </select>
                </label>
                <label className={labelClass}>
                  Title
                  <input name="title" className={inputClass} required />
                </label>
                <label className={labelClass}>
                  Organization
                  <input name="organization" className={inputClass} />
                </label>
                <label className={labelClass}>
                  Location
                  <input name="location" className={inputClass} />
                </label>
              </div>
              <label className={labelClass}>
                Description
                <textarea name="description" className={inputClass} rows={4} required />
              </label>
              <label className={labelClass}>
                Measurable impact
                <input name="impact" className={inputClass} />
              </label>
              <label className={labelClass}>
                Skills used
                <input name="skills" className={inputClass} placeholder="Python, React, SQL" />
              </label>
              <label className={labelClass}>
                Evidence/source note
                <input name="evidenceNote" className={inputClass} />
              </label>
              <div className="grid gap-2 text-sm text-stone-700 sm:grid-cols-2">
                {["resumeAllowed", "coverLetterAllowed", "answersAllowed", "verified"].map((name) => (
                  <label key={name} className="flex items-center gap-2">
                    <input name={name} type="checkbox" defaultChecked={name !== "verified"} />
                    {labelForFlag(name)}
                  </label>
                ))}
              </div>
              <SubmitButton>Add fact</SubmitButton>
            </form>
          </Panel>
        </div>
      ) : (
        <EmptyState title="No profile yet" body="Complete onboarding before adding Truth Vault facts." />
      )}

      <div className="mt-6">
        <h2 className="mb-3 text-lg font-semibold">Stored facts</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {profile?.facts.length ? (
            profile.facts.map((fact) => (
              <Panel key={fact.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{fact.title}</p>
                    <p className="text-sm text-[var(--muted)]">{fact.type}</p>
                  </div>
                  {fact.verified ? (
                    <Badge tone="good">
                      <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden />
                      verified
                    </Badge>
                  ) : (
                    <Badge tone="warn">unverified</Badge>
                  )}
                </div>
                <p className="mt-3 text-sm text-stone-700">{fact.description}</p>
                {fact.impact ? <p className="mt-2 text-sm font-medium text-emerald-800">{fact.impact}</p> : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {toList(fact.skills).map((skill) => (
                    <Badge key={skill} tone="info">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </Panel>
            ))
          ) : (
            <EmptyState title="No facts yet" body="Add projects, internships, coursework, leadership, and skills before generating packets." />
          )}
        </div>
      </div>
    </>
  );
}

function toDateInput(value?: Date | null) {
  return value ? value.toISOString().slice(0, 10) : "";
}

function labelForFlag(name: string) {
  return {
    resumeAllowed: "Can appear on resume",
    coverLetterAllowed: "Can appear in cover letters",
    answersAllowed: "Can support answers",
    verified: "Verified",
  }[name];
}
