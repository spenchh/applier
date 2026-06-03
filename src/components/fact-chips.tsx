import { LinkIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type FactMap = Map<string, { title: string; type: string }>;

/** Renders the "based on these facts" citation chips for a generated artifact. */
export function FactChips({ ids, factMap }: { ids: string[]; factMap: FactMap }) {
  const known = ids.map((id) => factMap.get(id)).filter(Boolean) as { title: string; type: string }[];
  if (known.length === 0) {
    return <span className="text-xs text-muted-foreground">No facts cited</span>;
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <LinkIcon className="size-3" /> Based on:
      </span>
      {known.map((f, i) => (
        <Badge key={i} variant="outline" title={f.type}>
          {f.title}
        </Badge>
      ))}
    </div>
  );
}
