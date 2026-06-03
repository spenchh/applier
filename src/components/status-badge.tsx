import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type ApplicationStatus, type TruthCheckStatus } from "@/lib/constants";
import { cn } from "@/lib/utils";

type Variant = "default" | "secondary" | "success" | "warning" | "destructive" | "muted" | "outline";

const STATUS_VARIANT: Record<ApplicationStatus, Variant> = {
  saved: "muted",
  "needs-info": "warning",
  drafted: "secondary",
  "ready-for-review": "default",
  approved: "default",
  submitted: "success",
  "online-assessment": "secondary",
  "interview-scheduled": "success",
  "interview-completed": "success",
  offer: "success",
  rejected: "destructive",
  withdrawn: "muted",
  archived: "muted",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as ApplicationStatus;
  return <Badge variant={STATUS_VARIANT[s] ?? "muted"}>{STATUS_LABELS[s] ?? status}</Badge>;
}

const TRUTH_VARIANT: Record<TruthCheckStatus, Variant> = {
  supported: "success",
  weak: "warning",
  unsupported: "destructive",
  sensitive: "warning",
  "needs-input": "warning",
  unknown: "muted",
};

const TRUTH_LABEL: Record<TruthCheckStatus, string> = {
  supported: "Supported",
  weak: "Weak",
  unsupported: "Unsupported",
  sensitive: "Sensitive",
  "needs-input": "Needs your input",
  unknown: "Unchecked",
};

export function TruthBadge({ status }: { status: string }) {
  const s = status as TruthCheckStatus;
  return <Badge variant={TRUTH_VARIANT[s] ?? "muted"}>{TRUTH_LABEL[s] ?? status}</Badge>;
}

export function ConfidenceBadge({ confidence }: { confidence?: string | null }) {
  if (!confidence) return null;
  const variant: Variant = confidence === "high" ? "success" : confidence === "low" ? "warning" : "secondary";
  return <Badge variant={variant}>Confidence: {confidence}</Badge>;
}

export function FitScoreBadge({ score }: { score: number | null | undefined }) {
  if (score === null || score === undefined) {
    return <Badge variant="muted">Not analyzed</Badge>;
  }
  const variant: Variant = score >= 70 ? "success" : score >= 45 ? "warning" : "destructive";
  return <Badge variant={variant}>Fit {score}/100</Badge>;
}

export function FitRing({ score }: { score: number | null | undefined }) {
  const value = score ?? 0;
  const color = value >= 70 ? "text-success" : value >= 45 ? "text-warning" : "text-destructive";
  const circumference = 2 * Math.PI * 26;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative inline-flex h-20 w-20 items-center justify-center">
      <svg className="h-20 w-20 -rotate-90" viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="26" fill="none" strokeWidth="6" className="stroke-muted" />
        <circle
          cx="30"
          cy="30"
          r="26"
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={score === null || score === undefined ? circumference : offset}
          className={cn("stroke-current transition-all", color)}
        />
      </svg>
      <span className={cn("absolute text-lg font-semibold", color)}>
        {score === null || score === undefined ? "—" : score}
      </span>
    </div>
  );
}
