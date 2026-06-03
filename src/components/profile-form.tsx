"use client";

import { BriefcaseBusiness, ChevronDown, GraduationCap, Link as LinkIcon, MapPin, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
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
  careerInterests?: string;
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

type PortfolioScan = {
  url: string;
  title?: string;
  description?: string;
  signals: string[];
  gaps: string[];
};

export function ProfileForm({ defaults, showAssistant = false }: { defaults: ProfileFormValues; showAssistant?: boolean }) {
  const { control, register, setValue } = useForm<ProfileFormValues>({
    defaultValues: defaults,
  });
  const values = useWatch({ control }) as ProfileFormValues;
  const [portfolioScan, setPortfolioScan] = useState<PortfolioScan | null>(null);
  const [portfolioScanStatus, setPortfolioScanStatus] = useState<"idle" | "loading" | "error">("idle");
  const phoneRegistration = register("phone", {
    onChange: (event) => {
      setValue("phone", formatPhoneInput(event.target.value), { shouldDirty: true });
    },
  });
  const completion = calculateCompletion(values);
  const smartLocations = preferredLocationRecommendation(values.location, values.school);
  const internshipLanes = suggestInternshipLanes(values.careerInterests, values.major);
  const profileAudit = buildProfileAssetAudit(values);
  const scannablePortfolioUrl = pickScannablePortfolioUrl(values);
  const activePortfolioScan = portfolioScan?.url === scannablePortfolioUrl ? portfolioScan : null;
  const activePortfolioScanStatus = scannablePortfolioUrl ? portfolioScanStatus : "idle";

  useEffect(() => {
    if (!scannablePortfolioUrl) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setPortfolioScanStatus("loading");
      try {
        const response = await fetch("/api/profile-link-audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: scannablePortfolioUrl }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Unable to scan portfolio");
        const payload = (await response.json()) as PortfolioScan;
        setPortfolioScan(payload);
        setPortfolioScanStatus("idle");
      } catch {
        if (!controller.signal.aborted) {
          setPortfolioScan(null);
          setPortfolioScanStatus("error");
        }
      }
    }, 700);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [scannablePortfolioUrl]);

  return (
    <form action={saveProfileAction} className="grid gap-6">
      {showAssistant ? (
        <section className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-[#1d211f]">Profile completion</span>
            <span className="font-medium text-[var(--muted)]">{completion}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-stone-200/80">
            <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${completion}%` }} />
          </div>
        </section>
      ) : null}

      <FormSection icon={<UserRound className="h-4 w-4" aria-hidden />} title="Identity">
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Legal first and last name
            <input className={inputClass} placeholder="First Last" autoComplete="name" {...register("legalName")} required />
            <FieldHint>Middle name is not needed for normal internship applications unless a company asks for it.</FieldHint>
          </label>
          <label className={labelClass}>
            Preferred or display name
            <input className={inputClass} placeholder="What recruiters can call you" autoComplete="given-name" {...register("preferredName")} required />
          </label>
          <label className={labelClass}>
            Email
            <input className={inputClass} type="email" autoComplete="email" placeholder="you@example.com" {...register("email")} required />
          </label>
          <label className={labelClass}>
            Phone
            <input className={inputClass} type="tel" inputMode="tel" autoComplete="tel" placeholder="(312) 555-0184" {...phoneRegistration} required />
          </label>
          <label className={labelClass}>
            Current location
            <input className={inputClass} list="profile-location-options" placeholder="City, state, or Remote" autoComplete="address-level2" {...register("location")} required />
          </label>
          <label className={labelClass}>
            Work authorization
            <SelectControl {...register("workAuthorization")} required>
              <option value="">Select verified status</option>
              {workAuthorizationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectControl>
            <FieldHint>Choose only what is accurate and verified.</FieldHint>
          </label>
        </div>
      </FormSection>

      <FormSection icon={<GraduationCap className="h-4 w-4" aria-hidden />} title="Education">
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            School
            <input className={inputClass} list="profile-school-options" placeholder="Start typing your school" {...register("school")} required />
          </label>
          <label className={labelClass}>
            Degree level
            <SelectControl {...register("degree")} required>
              <option value="">Select degree level</option>
              {degreeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </SelectControl>
          </label>
          <label className={labelClass}>
            Major or concentration
            <input className={inputClass} list="profile-major-options" placeholder="Start typing a major" {...register("major")} required />
          </label>
          <label className={labelClass}>
            Minor
            <input className={inputClass} list="profile-major-options" placeholder="Optional" {...register("minor")} />
          </label>
          <label className={labelClass}>
            Graduation date
            <input className={inputClass} type="date" {...register("graduationDate")} required />
          </label>
          <label className={labelClass}>
            GPA
            <input className={inputClass} inputMode="decimal" placeholder="For example 3.7/4.0" {...register("gpa")} required />
          </label>
        </div>
      </FormSection>

      <FormSection icon={<BriefcaseBusiness className="h-4 w-4" aria-hidden />} title="Internship interests">
        <label className={labelClass}>
          What are you interested in?
          <textarea
            className={inputClass}
            rows={4}
            placeholder="Examples: sports marketing, finance, consulting, public policy, health care, music, fashion, data, design, startups"
            {...register("careerInterests")}
            required
          />
          <FieldHint>Use natural language. The explorer will translate this into internship lanes, search phrases, and application positioning.</FieldHint>
        </label>
        <div className="grid gap-3 md:grid-cols-3">
          {internshipLanes.map((lane) => (
            <div key={lane.title} className="rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-3 shadow-sm">
              <p className="text-sm font-semibold text-[#1d211f]">{lane.title}</p>
              <p className="mt-1 text-xs text-stone-600">{lane.why}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {lane.searches.map((search) => (
                  <span key={search} className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-stone-700 ring-1 ring-stone-200">
                    {search}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection icon={<MapPin className="h-4 w-4" aria-hidden />} title="Application preferences">
        <div className="grid gap-4 md:grid-cols-2">
          <label className={labelClass}>
            Earliest start date
            <input className={inputClass} type="date" {...register("earliestStartDate")} required />
          </label>
          <label className={labelClass}>
            Remote preference
            <SelectControl {...register("remotePreference")} required>
              <option value="">Select preference</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
              <option value="no_preference">No preference</option>
            </SelectControl>
          </label>
          <label className={labelClass}>
            Preferred terms
            <input className={inputClass} list="profile-term-options" placeholder="Summer, Fall" {...register("preferredTerms")} required />
            <SuggestionRow values={termSuggestions} onPick={(value) => setValue("preferredTerms", appendCsvValue(values.preferredTerms, value), { shouldDirty: true })} />
          </label>
          <label className={labelClass}>
            Preferred locations
            <input className={inputClass} list="profile-location-options" placeholder="Chicago, IL, Remote" {...register("preferredLocations")} required />
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
        <ProfileAssetAudit audit={profileAudit} portfolioScan={activePortfolioScan} portfolioScanStatus={activePortfolioScanStatus} />
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

function SelectControl({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative block">
      <select
        {...props}
        className="w-full appearance-none rounded-lg border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 pr-10 text-sm outline-none ring-[var(--focus)] transition hover:border-stone-400 focus:border-emerald-600 focus:ring-4"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" aria-hidden />
    </span>
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
        <button key={value} type="button" onClick={() => onPick(value)} className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700 transition hover:bg-stone-200">
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
    "careerInterests",
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

function appendCsvValue(current: string | undefined, value: string) {
  const values = (current ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (!values.some((item) => item.toLowerCase() === value.toLowerCase())) values.push(value);
  return values.join(", ");
}

function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

type ProfileAssetAudit = {
  score: number;
  strengths: string[];
  gaps: string[];
  summary: string;
  recruiterInquiry: string[];
};

function ProfileAssetAudit({ audit, portfolioScan, portfolioScanStatus }: { audit: ProfileAssetAudit; portfolioScan: PortfolioScan | null; portfolioScanStatus: "idle" | "loading" | "error" }) {
  return (
    <div className="grid gap-4 rounded-lg border border-[var(--line)] bg-[var(--surface-soft)] p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#1d211f]">Profile asset audit</p>
          <p className="mt-1 text-xs text-stone-600">Generated from your LinkedIn, GitHub, portfolio, and website links.</p>
        </div>
        <span className="rounded-full bg-[var(--surface)] px-2.5 py-1 text-xs font-semibold text-[var(--brand)] ring-1 ring-emerald-200">{audit.score}% ready</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-200">
        <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${audit.score}%` }} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <AuditList title="Looks ready" items={audit.strengths} empty="Add professional links to start the audit." />
        <AuditList title="Improve next" items={audit.gaps} empty="No major gaps detected from the links entered." />
      </div>
      <div className="rounded-lg bg-[var(--surface)] p-3 text-sm text-stone-700 shadow-sm ring-1 ring-stone-200">
        <p className="font-semibold text-[#1d211f]">Generated recruiter summary</p>
        <p className="mt-2">{audit.summary}</p>
      </div>
      <div className="rounded-lg bg-[var(--surface)] p-3 text-sm text-stone-700 shadow-sm ring-1 ring-stone-200">
        <p className="font-semibold text-[#1d211f]">Portfolio website scan</p>
        {portfolioScanStatus === "loading" ? <p className="mt-2 text-[var(--muted)]">Scanning public page metadata...</p> : null}
        {portfolioScanStatus === "error" ? <p className="mt-2 text-amber-700">Could not scan that site automatically. The checklist below still applies.</p> : null}
        {portfolioScan ? (
          <div className="mt-2 grid gap-2">
            <p>{portfolioScan.title || portfolioScan.url}</p>
            {portfolioScan.description ? <p className="text-[var(--muted)]">{portfolioScan.description}</p> : null}
            <AuditList title="Detected" items={portfolioScan.signals} empty="No common portfolio sections detected." />
            <AuditList title="Missing from scan" items={portfolioScan.gaps} empty="No major gaps detected." />
          </div>
        ) : portfolioScanStatus === "idle" ? (
          <p className="mt-2 text-[var(--muted)]">Add a portfolio or website URL to scan public page basics.</p>
        ) : null}
      </div>
      <div className="rounded-lg bg-[var(--surface)] p-3 text-sm text-stone-700 shadow-sm ring-1 ring-stone-200">
        <p className="font-semibold text-[#1d211f]">Recruiter contact form should ask for</p>
        <ul className="mt-2 grid gap-1">
          {audit.recruiterInquiry.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function AuditList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-stone-500">{title}</p>
      <ul className="mt-2 grid gap-2 text-sm text-stone-700">
        {items.length ? items.map((item) => <li key={item} className="rounded-lg bg-[var(--surface)] px-3 py-2 shadow-sm ring-1 ring-stone-200">{item}</li>) : <li className="text-[var(--muted)]">{empty}</li>}
      </ul>
    </div>
  );
}

function buildProfileAssetAudit(values: ProfileFormValues): ProfileAssetAudit {
  const strengths: string[] = [];
  const gaps: string[] = [];
  const hasLinkedIn = /linkedin\.com\/in\//i.test(values.linkedinUrl ?? "");
  const hasGitHub = /github\.com\/[^/\s]+/i.test(values.githubUrl ?? "");
  const hasPortfolio = isUrl(values.portfolioUrl) || isUrl(values.websiteUrl);

  if (hasLinkedIn) strengths.push("LinkedIn profile URL is connected for recruiter verification.");
  else gaps.push("Add a LinkedIn /in/ URL with headline, education, projects, and contact visibility.");

  if (hasGitHub) strengths.push("GitHub profile is connected for code/project proof.");
  else gaps.push("For computer engineering or tech roles, add GitHub with pinned, documented projects.");

  if (hasPortfolio) strengths.push("Portfolio or personal website is connected for work samples.");
  else gaps.push("Add a portfolio site with About, resume/CV, projects, contact, and scheduling links.");

  if (values.careerInterests) strengths.push("Career interests are captured, so the app can suggest internship lanes.");
  if (!values.portfolioUrl && values.githubUrl) gaps.push("Consider linking 2-3 GitHub projects from a portfolio page so recruiters see context, not just code.");
  if (!values.websiteUrl && hasPortfolio) gaps.push("Use the website field for the main recruiter-facing URL if portfolio is your strongest asset.");

  const score = Math.min(100, 25 + [hasLinkedIn, hasGitHub, hasPortfolio, Boolean(values.careerInterests)].filter(Boolean).length * 18);
  const name = values.preferredName || values.legalName || "This candidate";
  const focus = values.careerInterests || values.major || "internship opportunities";
  const summary = `${name} is preparing for ${focus}. The strongest recruiter-facing profile should lead with a concise summary, resume/CV access, verified project samples, professional links, and a clear contact or scheduling path.`;

  return {
    score,
    strengths,
    gaps: gaps.slice(0, 5),
    summary,
    recruiterInquiry: ["Role or project type", "Preferred interview times", "Start date and internship term", "Location or remote expectations", "Best contact email"],
  };
}

function isUrl(value?: string) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function pickScannablePortfolioUrl(values: ProfileFormValues) {
  const url = values.portfolioUrl || values.websiteUrl;
  if (!isUrl(url)) return "";
  const host = hostname(url);
  if (/linkedin\.com|github\.com|indeed\.com|handshake\.com|joinhandshake\.com/i.test(host)) return "";
  return url ?? "";
}

function hostname(value?: string) {
  if (!value) return "";
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function suggestInternshipLanes(interests?: string, major?: string) {
  const text = `${interests ?? ""} ${major ?? ""}`.toLowerCase();
  const lanes = [
    {
      match: /sport|team|athletic|media|entertainment/,
      title: "Sports, media, and entertainment",
      why: "Good for marketing, partnerships, operations, analytics, production, and fan engagement internships.",
      searches: ["sports marketing intern", "partnerships intern", "fan experience intern"],
    },
    {
      match: /finance|bank|invest|market|account|economic/,
      title: "Finance and business analysis",
      why: "Targets analyst, corporate finance, strategy, accounting, and market research internships.",
      searches: ["finance intern", "business analyst intern", "market research intern"],
    },
    {
      match: /policy|government|law|legal|nonprofit|public/,
      title: "Policy, legal, and public impact",
      why: "Fits research, legislative, advocacy, compliance, nonprofit, and civic program internships.",
      searches: ["policy intern", "legal intern", "public affairs intern"],
    },
    {
      match: /design|creative|figma|ux|ui|fashion|brand/,
      title: "Design, UX, and brand",
      why: "Highlights design thinking, research, portfolio work, brand systems, and user-facing projects.",
      searches: ["UX intern", "brand strategy intern", "creative intern"],
    },
    {
      match: /data|tech|software|computer|engineer|ai|analytics/,
      title: "Technology and data",
      why: "Covers software, data analytics, AI operations, product, and technical business roles.",
      searches: ["data analyst intern", "software intern", "AI operations intern"],
    },
    {
      match: /health|medicine|bio|clinic|psych|care/,
      title: "Health, research, and life sciences",
      why: "Useful for clinical research, public health, lab operations, health tech, and patient experience roles.",
      searches: ["public health intern", "clinical research intern", "healthcare operations intern"],
    },
    {
      match: /write|journal|communicat|social|marketing|music|content/,
      title: "Communications and marketing",
      why: "Turns writing, content, campaigns, social media, and storytelling into internship search lanes.",
      searches: ["communications intern", "content marketing intern", "social media intern"],
    },
  ];
  const matches = lanes.filter((lane) => lane.match.test(text));
  const fallback = [
    {
      title: "General business and operations",
      why: "A flexible starting point for students still exploring role fit across industries.",
      searches: ["operations intern", "project coordinator intern", "business intern"],
    },
    {
      title: "Research and strategy",
      why: "Good when your interests are broad and you want roles that use writing, analysis, and synthesis.",
      searches: ["research intern", "strategy intern", "program intern"],
    },
    {
      title: "Marketing and communications",
      why: "A strong non-technical lane for students who like storytelling, brands, events, or people-facing work.",
      searches: ["marketing intern", "communications intern", "community intern"],
    },
  ];
  return (matches.length ? matches : fallback).slice(0, 3);
}

function unique(value: string, index: number, values: string[]) {
  return values.indexOf(value) === index;
}
