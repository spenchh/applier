import { ShieldCheck, Check } from "lucide-react";

const ITEMS = [
  "This application requires my explicit review and approval before anything is submitted or exported.",
  "No CAPTCHAs, login gates, rate limits, anti-bot controls, or hidden fields are bypassed.",
  "Restricted platforms (LinkedIn, Indeed, Handshake, Simplify, …) are never scraped or auto-applied to.",
  "No experience, skills, credentials, GPA, dates, eligibility, or demographics are fabricated.",
  "Voluntary demographic / self-identification questions are not auto-answered.",
  "Eligibility answers come only from facts I explicitly stored and confirm per application.",
];

/** Static compliance checklist shown on the review/submission screen. */
export function ComplianceChecklist() {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <ShieldCheck className="size-4 text-success" />
        <h3 className="text-sm font-semibold">Compliance checklist</h3>
      </div>
      <ul className="space-y-2">
        {ITEMS.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <Check className="mt-0.5 size-4 shrink-0 text-success" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
