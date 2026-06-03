"use client";

import { useForm } from "react-hook-form";
import { saveProfileAction } from "@/app/actions";
import { inputClass, labelClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

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

export function ProfileForm({ defaults }: { defaults: ProfileFormValues }) {
  const { register } = useForm<ProfileFormValues>({
    defaultValues: defaults,
  });

  return (
    <form action={saveProfileAction} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Legal name
          <input className={inputClass} {...register("legalName")} required />
        </label>
        <label className={labelClass}>
          Preferred name
          <input className={inputClass} {...register("preferredName")} />
        </label>
        <label className={labelClass}>
          Email
          <input className={inputClass} type="email" {...register("email")} required />
        </label>
        <label className={labelClass}>
          Phone
          <input className={inputClass} {...register("phone")} />
        </label>
        <label className={labelClass}>
          Location
          <input className={inputClass} {...register("location")} />
        </label>
        <label className={labelClass}>
          School
          <input className={inputClass} {...register("school")} />
        </label>
        <label className={labelClass}>
          Degree
          <input className={inputClass} {...register("degree")} />
        </label>
        <label className={labelClass}>
          Major
          <input className={inputClass} {...register("major")} />
        </label>
        <label className={labelClass}>
          Minor
          <input className={inputClass} {...register("minor")} />
        </label>
        <label className={labelClass}>
          Graduation date
          <input className={inputClass} type="date" {...register("graduationDate")} />
        </label>
        <label className={labelClass}>
          GPA
          <input className={inputClass} {...register("gpa")} />
        </label>
        <label className={labelClass}>
          Earliest start date
          <input className={inputClass} type="date" {...register("earliestStartDate")} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Work authorization
          <input className={inputClass} {...register("workAuthorization")} />
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
          <input className={inputClass} placeholder="summer, fall" {...register("preferredTerms")} />
        </label>
        <label className={labelClass}>
          Preferred locations
          <input className={inputClass} placeholder="Chicago, remote" {...register("preferredLocations")} />
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className={labelClass}>
          Portfolio URL
          <input className={inputClass} type="url" {...register("portfolioUrl")} />
        </label>
        <label className={labelClass}>
          GitHub URL
          <input className={inputClass} type="url" {...register("githubUrl")} />
        </label>
        <label className={labelClass}>
          LinkedIn URL
          <input className={inputClass} type="url" {...register("linkedinUrl")} />
        </label>
        <label className={labelClass}>
          Website URL
          <input className={inputClass} type="url" {...register("websiteUrl")} />
        </label>
      </div>

      <label className="flex items-start gap-3 text-sm text-stone-700">
        <input className="mt-1 h-4 w-4 rounded border-[var(--line)]" type="checkbox" {...register("sponsorshipRequired")} />
        Sponsorship required
      </label>

      <div>
        <SubmitButton>Save profile</SubmitButton>
      </div>
    </form>
  );
}
