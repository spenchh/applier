"use client";

import { GraduationCap, Link as LinkIcon, MapPin, Sparkles, UserRound } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { saveProfileAction } from "@/app/actions";
import { SubmitButton } from "@/components/submit-button";
import { inputClass, labelClass } from "@/components/ui";

type ProfileFormValues = {
  legalName: string;
  preferredName?: string;
  email: string;
  phone?: string;
  location?: string;
  school?: string;
  degree?: string;
  major?: string;
  minor?: string;
  graduationDate?: string;
  gpa?: string;
  workAuthorization?: string;
  sponsorshipRequired?: boolean;
  earliestStartDate?: string;
  preferredTerms?: string;
  preferredLocations?: string;
  remotePreference?: string;
  portfolioUrl?: string;
  githubUrl?: string;
  linkedinUrl?: string;
  websiteUrl?: string;
};

const degreeOptions = [
  "High school diploma",
  "Associate degree",
  "Bachelor's degree",
  "Master's degree",
  "Doctorate",
  "Certificate program",
  "Other",
];

const workAuthorizationOptions = [
  "U.S. citizen",
  "U.S. permanent resident",
  "Authorized to work in the U.S.",
  "F-1 student, CPT/OPT eligible",
  "Will need visa sponsorship",
  "Prefer not to answer yet",
];

const majorSuggestions = [
  "Business Administration",
  "Communications",
  "Computer Science",
  "Data Science",
  "Economics",
  "English",
  "Finance",
  "Journalism",
  "Marketing",
  "Mechanical Engineering",
  "Political Science",
  "Psychology",
  "Public Policy",
  "Sociology",
  "Statistics",
];

const schoolSuggestions = [
  "Northwestern University",
  "University of Chicago",
  "University of Illinois Urbana-Champaign",
  "University of Illinois Chicago",
  "DePaul University",
  "Loyola University Chicago",
  "Illinois Institute of Technology",
  "Purdue University",
  "Indiana University Bloomington",
  "University of Michigan",
  "University of Wisconsin-Madison",
  "Ohio State University",
];

const locationSuggestions = [
  "Chicago, IL",
  "Evanston, IL",
  "New York, NY",
  "Washington, DC",
  "Boston, MA",
  "San Francisco, CA",
  "Los Angeles, CA",
  "Seattle, WA",
  "Austin, TX",
  "Atlanta, GA",
  "Remote",
];

const termSuggestions = ["Summer", "Fall", "Spring", "Winter", "Academic year", "Part-time", "Full-time"];

export function ProfileForm({ defaults, showAssistant = false }: { defaults: ProfileFormValues; showAssistant?: boolean }) {
  const { control, register, setValue } = useForm<ProfileFormValues>({
    defaultValues: defaults,
  });
  const values = useWatch({ control }) as ProfileFormValues;
  const completion = calculateCompletion(values);
  const schoolRecommendation = recommendSchoolLocation(values.school);
  const smartLocations = preferredLocationRecommendation(values.location, values.school);
  const tips = buildProfileTips(values);

  function applyStarterRecommendations() {
    if (!values.degree) setValue("degree", "Bachelor's degree", { shouldDirty: true });
    if (!values.remotePreference) setValue("remotePreference", "hybrid", { shouldDirty: true });
    if (!values.preferredTerms) setValue("preferredTerms", "Summer, Fall", { shouldDirty: true });
    if (!values.preferredLocations) setValue("preferredLocations", smartLocations, { shouldDirty: true });
    if (schoolRecommendation && !values.location) setValue("location", schoolRecommendation, { shouldDirty: true });
  }

  function formatPhone() {
    const formatted = formatUsPhone(values.phone);
    if (formatted) setValue("phone", formatted, { shouldDirty: true });
  }

  return (
    <form action={saveProfileAction} className="grid gap-6">
      {showAssistant ? (
        <section className="grid gap-4 rounded-md bg-[#f5f7f1] p-4 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#17473a]">
              <Sparkles className="h-4 w-4" aria-hidden />
              AI profile assist
            </div>
            <p className="mt-2 text-sm text-stone-700">
              {completion}% complete. I can fill safe preference fields from your school, location, and internship goals.
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-200">
              <div className="h-full rounded-full bg-[#17473a]" style={{ width: `${completion}%` }} />
            </div>
          </div>
          <div className="grid gap-3">
            <div className="flex flex-wrap gap-2">
              <AssistButton onClick={applyStarterRecommendations}>Apply starter recommendations</AssistButton>
              {schoolRecommendation ? <AssistButton onClick={() => setValue("location", schoolRecommendation, { shouldDirty: true })}>Use school city</AssistButton> : null}
              <AssistButton onClick={() => setValue("preferredTerms", appendCsvValue(values.preferredTerms, "Summer"), { shouldDirty: true })}>Add summer</AssistButton>
              <AssistButton onClick={() => setValue("preferredLocations", smartLocations, { shouldDirty: true })}>Suggest locations</AssistButton>
              {formatUsPhone(values.phone) ? <AssistButton onClick={formatPhone}>Format phone</AssistButton> : null}
            </div>
            <div className="grid gap-2 text-xs text-stone-600 sm:grid-cols-2">
              {tips.map((tip) => (
                <p key={tip} className="rounded-md bg-white/70 px-3 py-2">
                  {tip}
                </p>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <FormSection icon={<UserRound className="h-4 w-4" aria-hidden />} title="Identity">
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Full legal name
            <input className={inputClass} placeholder="First Middle Last" autoComplete="name" {...register("legalName")} required />
            <FieldHint>Use the name that should appear on applications and background forms.</FieldHint>
          </label>
          <label className={labelClass}>
            Preferred or display name
            <input className={inputClass} placeholder="What recruiters can call you" autoComplete="given-name" {...register("preferredName")} />
          </label>
          <label className={labelClass}>
            Email
            <input className={inputClass} type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} required />
          </label>
          <label className={labelClass}>
            Phone
            <input className={inputClass} type="tel" inputMode="tel" autoComplete="tel" placeholder="(312) 555-0184" {...register("phone")} />
          </label>
          <label className={labelClass}>
            Current location
            <input className={inputClass} list="profile-location-options" placeholder="City, state, or Remote" autoComplete="address-level2" {...register("location")} />
          </label>
          <label className={labelClass}>
            Work authorization
            <select className={inputClass} {...register("workAuthorization")}>
              <option value="">Select verified status</option>
              {workAuthorizationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <FieldHint>Choose only what is accurate and verified.</FieldHint>
          </label>
        </div>
      </FormSection>

      <FormSection icon={<GraduationCap className="h-4 w-4" aria-hidden />} title="Education">
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            School
            <input className={inputClass} list="profile-school-options" placeholder="Start typing your school" {...register("school")} />
          </label>
          <label className={labelClass}>
            Degree level
            <select className={inputClass} {...register("degree")}>
              <option value="">Select degree level</option>
              {degreeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Major or concentration
            <input className={inputClass} list="profile-major-options" placeholder="Start typing a major" {...register("major")} />
          </label>
          <label className={labelClass}>
            Minor
            <input className={inputClass} list="profile-major-options" placeholder="Optional" {...register("minor")} />
          </label>
          <label className={labelClass}>
            Graduation date
            <input className={inputClass} type="date" {...register("graduationDate")} />
          </label>
          <label className={labelClass}>
            GPA
            <input className={inputClass} inputMode="decimal" placeholder="Optional, for example 3.7/4.0" {...register("gpa")} />
          </label>
        </div>
      </FormSection>

      <FormSection icon={<MapPin className="h-4 w-4" aria-hidden />} title="Application preferences">
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Earliest start date
            <input className={inputClass} type="date" {...register("earliestStartDate")} />
          </label>
          <label className={labelClass}>
            Remote preference
            <select className={inputClass} {...register("remotePreference")}>
              <option value="">No preference</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </select>
          </label>
          <label className={labelClass}>
            Preferred terms
            <input className={inputClass} list="profile-term-options" placeholder="Summer, Fall" {...register("preferredTerms")} />
            <SuggestionRow values={termSuggestions} onPick={(value) => setValue("preferredTerms", appendCsvValue(values.preferredTerms, value), { shouldDirty: true })} />
          </label>
          <label className={labelClass}>
            Preferred locations
            <input className={inputClass} list="profile-location-options" placeholder="Chicago, IL, Remote" {...register("preferredLocations")} />
            <SuggestionRow values={smartLocations.split(", ").filter(Boolean).slice(0, 4)} onPick={(value) => setValue("preferredLocations", appendCsvValue(values.preferredLocations, value), { shouldDirty: true })} />
          </label>
        </div>
      </FormSection>

      <FormSection icon={<LinkIcon className="h-4 w-4" aria-hidden />} title="Links">
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Portfolio URL
            <input className={inputClass} type="url" placeholder="https://..." {...register("portfolioUrl")} />
          </label>
          <label className={labelClass}>
            GitHub URL
            <input className={inputClass} type="url" placeholder="https://github.com/..." {...register("githubUrl")} />
          </label>
          <label className={labelClass}>
            LinkedIn URL
            <input className={inputClass} type="url" placeholder="https://www.linkedin.com/in/..." {...register("linkedinUrl")} />
          </label>
          <label className={labelClass}>
            Website URL
            <input className={inputClass} type="url" placeholder="https://..." {...register("websiteUrl")} />
          </label>
        </div>
      </FormSection>

      <label className="flex items-start gap-3 text-sm text-stone-700">
        <input className="mt-1 h-4 w-4 rounded border-[var(--line)]" type="checkbox" {...register("sponsorshipRequired")} />
        I require sponsorship for future employment
      </label>

      <datalist id="profile-location-options">
        {locationSuggestions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id="profile-school-options">
        {schoolSuggestions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id="profile-major-options">
        {majorSuggestions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id="profile-term-options">
        {termSuggestions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>

      <div>
        <SubmitButton>Save profile</SubmitButton>
      </div>
    </form>
  );
}

function FormSection({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-[var(--line)] pt-5 first:border-t-0 first:pt-0">
      <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] text-stone-600">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function AssistButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-[#17473a] ring-1 ring-emerald-200 hover:bg-emerald-50">
      {children}
    </button>
  );
}

function FieldHint({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-normal leading-5 text-[var(--muted)]">{children}</span>;
}

function SuggestionRow({ values, onPick }: { values: string[]; onPick: (value: string) => void }) {
  if (!values.length) return null;
  return (
    <span className="flex flex-wrap gap-2 pt-1">
      {values.map((value) => (
        <button key={value} type="button" onClick={() => onPick(value)} className="rounded-md bg-stone-100 px-2 py-1 text-xs font-medium text-stone-700 hover:bg-stone-200">
          {value}
        </button>
      ))}
    </span>
  );
}

function calculateCompletion(values: ProfileFormValues) {
  const trackedFields: Array<keyof ProfileFormValues> = [
    "legalName",
    "preferredName",
    "email",
    "phone",
    "location",
    "school",
    "degree",
    "major",
    "graduationDate",
    "workAuthorization",
    "preferredTerms",
    "preferredLocations",
    "remotePreference",
  ];
  const filled = trackedFields.filter((field) => Boolean(String(values[field] ?? "").trim())).length;
  return Math.round((filled / trackedFields.length) * 100);
}

function recommendSchoolLocation(school?: string) {
  const normalized = school?.toLowerCase() ?? "";
  if (normalized.includes("northwestern")) return "Evanston, IL";
  if (normalized.includes("university of chicago")) return "Chicago, IL";
  if (normalized.includes("uic") || normalized.includes("depaul") || normalized.includes("loyola")) return "Chicago, IL";
  if (normalized.includes("purdue")) return "West Lafayette, IN";
  if (normalized.includes("michigan")) return "Ann Arbor, MI";
  if (normalized.includes("wisconsin")) return "Madison, WI";
  return "";
}

function preferredLocationRecommendation(location?: string, school?: string) {
  const schoolCity = recommendSchoolLocation(school);
  const currentLocation = location?.trim();
  if (schoolCity) return [schoolCity, "Chicago, IL", "Remote"].filter(unique).join(", ");
  if (currentLocation && !/^united states$/i.test(currentLocation)) return [currentLocation, "Remote"].filter(unique).join(", ");
  return "Chicago, IL, New York, NY, Washington, DC, Remote";
}

function buildProfileTips(values: ProfileFormValues) {
  const tips = [];
  if (!values.legalName || values.legalName.trim().split(/\s+/).length < 2) tips.push("Use your full first and last legal name.");
  if (/^united states$/i.test(values.location ?? "")) tips.push("A city and state works better than only country.");
  if (!values.degree) tips.push("Pick a degree level so job filters can match internships correctly.");
  if (!values.workAuthorization) tips.push("Leave work authorization blank until you can answer it accurately.");
  if (!values.preferredLocations) tips.push("Add at least one city plus Remote if you are open to it.");
  return tips.slice(0, 4);
}

function appendCsvValue(current: string | undefined, value: string) {
  const values = (current ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!values.some((item) => item.toLowerCase() === value.toLowerCase())) values.push(value);
  return values.join(", ");
}

function formatUsPhone(phone?: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length !== 10) return "";
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function unique(value: string, index: number, values: string[]) {
  return values.indexOf(value) === index;
}
