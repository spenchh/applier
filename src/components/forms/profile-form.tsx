"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2, ShieldCheck } from "lucide-react";
import { saveProfileAction, type ActionState } from "@/lib/actions/profile-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/submit-button";
import type { UserProfile } from "@prisma/client";

const initial: ActionState = { ok: false };

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  placeholder,
  error,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  type?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue ?? ""} placeholder={placeholder} />
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function ProfileForm({
  profile,
  redirectTo,
  decryptedPhone,
  decryptedWorkAuth,
}: {
  profile: UserProfile;
  redirectTo?: string;
  decryptedPhone: string;
  decryptedWorkAuth: string;
}) {
  const [state, action] = useActionState(saveProfileAction, initial);
  const fe = state.fieldErrors ?? {};
  const terms = profile.preferredTerms ? JSON.parse(profile.preferredTerms).join(", ") : "";
  const locations = profile.preferredLocations ? JSON.parse(profile.preferredLocations).join(", ") : "";

  return (
    <form action={action} className="space-y-6">
      {redirectTo ? <input type="hidden" name="__redirect" value={redirectTo} /> : null}

      <Card>
        <CardHeader>
          <CardTitle>Basics</CardTitle>
          <CardDescription>How employers will identify and reach you.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field name="legalName" label="Legal name" defaultValue={profile.legalName} error={fe.legalName} />
          <Field name="preferredName" label="Preferred name" defaultValue={profile.preferredName} />
          <Field name="email" label="Email" type="email" defaultValue={profile.email} error={fe.email} />
          <Field name="phone" label="Phone" defaultValue={decryptedPhone} hint="Encrypted at rest." />
          <Field name="location" label="Location" defaultValue={profile.location} placeholder="City, State" />
          <div className="space-y-1.5">
            <Label htmlFor="remotePreference">Remote preference</Label>
            <Select id="remotePreference" name="remotePreference" defaultValue={profile.remotePreference ?? "any"}>
              <option value="any">No preference</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Education</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field name="school" label="School" defaultValue={profile.school} />
          <Field name="degree" label="Degree" defaultValue={profile.degree} placeholder="B.S." />
          <Field name="major" label="Major" defaultValue={profile.major} />
          <Field name="minor" label="Minor" defaultValue={profile.minor} />
          <Field name="graduationDate" label="Graduation date" type="date" defaultValue={profile.graduationDate?.toISOString().slice(0, 10)} />
          <Field name="gpa" label="GPA (optional)" defaultValue={profile.gpa} placeholder="3.7" />
        </CardContent>
      </Card>

      <Card className="border-warning/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-warning" /> Eligibility &amp; availability
          </CardTitle>
          <CardDescription>
            These answers must be <strong>accurate</strong>. InternPilot only uses what you enter here and never
            guesses or fabricates eligibility, authorization, or availability.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            name="workAuthorization"
            label="Work authorization"
            defaultValue={decryptedWorkAuth}
            placeholder="e.g. Authorized to work in the U.S."
            hint="Encrypted at rest. Used only when a posting asks and you confirm per-application."
          />
          <div className="flex items-end gap-2 pb-1">
            <Checkbox id="sponsorshipRequired" name="sponsorshipRequired" defaultChecked={profile.sponsorshipRequired} />
            <Label htmlFor="sponsorshipRequired">I will require visa sponsorship</Label>
          </div>
          <Field name="earliestStartDate" label="Earliest start date" type="date" defaultValue={profile.earliestStartDate?.toISOString().slice(0, 10)} />
          <Field name="preferredTerms" label="Preferred terms" defaultValue={terms} placeholder="Summer 2026" hint="Comma-separated." />
          <Field name="preferredLocations" label="Preferred locations" defaultValue={locations} placeholder="Austin, Remote" hint="Comma-separated." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field name="portfolioUrl" label="Portfolio URL" defaultValue={profile.portfolioUrl} error={fe.portfolioUrl} />
          <Field name="githubUrl" label="GitHub URL" defaultValue={profile.githubUrl} error={fe.githubUrl} />
          <Field name="linkedinUrl" label="LinkedIn URL" defaultValue={profile.linkedinUrl} error={fe.linkedinUrl} />
          <Field name="websiteUrl" label="Personal website" defaultValue={profile.websiteUrl} error={fe.websiteUrl} />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <SubmitButton pendingText="Saving…">Save profile</SubmitButton>
        {state.error && !state.fieldErrors ? (
          <span className="flex items-center gap-1.5 text-sm text-destructive">
            <AlertCircle className="size-4" /> {state.error}
          </span>
        ) : null}
        {state.ok && state.message ? (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 className="size-4" /> {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
