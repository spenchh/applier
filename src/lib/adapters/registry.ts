import { isRestrictedPlatform, detectAtsProvider } from "../url";
import { ManualAdapter } from "./manual";
import { EmailAdapter } from "./email";
import { GreenhouseAdapter } from "./greenhouse";
import { LeverAdapter } from "./lever";
import { AshbyAdapter } from "./ashby";
import { SmartRecruitersAdapter } from "./smartrecruiters";
import type { ApplicationAdapter } from "./types";

const manual = new ManualAdapter();
const email = new EmailAdapter();
const greenhouse = new GreenhouseAdapter();
const lever = new LeverAdapter();
const ashby = new AshbyAdapter();
const smartrecruiters = new SmartRecruitersAdapter();

export const adapters = {
  manual,
  email,
  greenhouse,
  lever,
  ashby,
  smartrecruiters,
} as const;

export type AdapterKey = keyof typeof adapters;

/**
 * Choose the adapter to ATTEMPT a URL import with.
 *
 * Restricted platforms ALWAYS resolve to the ManualAdapter — we never scrape or
 * automate them. Known ATS hosts resolve to their official adapter (public API
 * import). Everything else resolves to Manual (the user pastes the description).
 */
export function adapterForImport(url: string): ApplicationAdapter {
  if (!url || isRestrictedPlatform(url)) return manual;
  switch (detectAtsProvider(url)) {
    case "greenhouse":
      return greenhouse;
    case "lever":
      return lever;
    case "ashby":
      return ashby;
    case "smartrecruiters":
      return smartrecruiters;
    default:
      return manual;
  }
}

/** Resolve an adapter by its application mode + provider for submission. */
export function adapterForSubmission(mode: string, atsProvider?: string | null): ApplicationAdapter {
  if (mode === "email") return email;
  if (mode === "adapter" && atsProvider && atsProvider in adapters) {
    return adapters[atsProvider as AdapterKey];
  }
  return manual;
}

export { ManualAdapter, EmailAdapter, GreenhouseAdapter, LeverAdapter, AshbyAdapter, SmartRecruitersAdapter };
