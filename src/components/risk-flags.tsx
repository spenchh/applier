import { AlertTriangle, ShieldAlert, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { RiskFlag } from "@/lib/llm/types";

/**
 * Renders posting risk indicators. We NEVER claim a posting is safe — this only
 * surfaces indicators for the user to evaluate themselves.
 */
export function RiskFlagList({ flags }: { flags: RiskFlag[] }) {
  if (!flags.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No automated risk indicators detected. This is not a guarantee — always verify the company independently.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {flags.map((f, i) => {
        const Icon = f.severity === "high" ? ShieldAlert : f.severity === "medium" ? AlertTriangle : Info;
        const variant = f.severity === "high" ? "destructive" : f.severity === "medium" ? "warning" : "muted";
        return (
          <li key={`${f.code}-${i}`} className="flex gap-2.5 rounded-md border bg-card p-3">
            <Icon
              className={
                f.severity === "high"
                  ? "mt-0.5 size-4 shrink-0 text-destructive"
                  : f.severity === "medium"
                    ? "mt-0.5 size-4 shrink-0 text-warning"
                    : "mt-0.5 size-4 shrink-0 text-muted-foreground"
              }
            />
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{f.label}</span>
                <Badge variant={variant as "destructive" | "warning" | "muted"}>{f.severity}</Badge>
              </div>
              {f.detail ? <p className="text-xs text-muted-foreground">{f.detail}</p> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function RiskCountBadge({ flags }: { flags: RiskFlag[] }) {
  if (!flags.length) return null;
  const high = flags.filter((f) => f.severity === "high").length;
  return (
    <Badge variant={high ? "destructive" : "warning"}>
      <AlertTriangle className="size-3" />
      {flags.length} risk {flags.length === 1 ? "flag" : "flags"}
    </Badge>
  );
}
