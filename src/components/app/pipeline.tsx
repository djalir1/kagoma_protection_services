import { Check } from "lucide-react";
import { pipelineStages, titleCase } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Pipeline({ status, compact }: { status: string; compact?: boolean }) {
  if (status === "cancelled") {
    return (
      <div className="text-xs font-semibold uppercase tracking-wider text-destructive">
        Cancelled
      </div>
    );
  }
  const at = pipelineStages.indexOf(status as (typeof pipelineStages)[number]);
  return (
    <ol className="flex items-center gap-1">
      {pipelineStages.map((s, i) => {
        const done = i < at || status === "reported";
        const current = i === at && status !== "reported";
        return (
          <li key={s} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex w-full items-center">
              <div
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold",
                  done && "border-primary bg-primary text-primary-foreground",
                  current && "border-primary bg-primary/15 text-primary",
                  !done && !current && "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="h-3 w-3" /> : i + 1}
              </div>
              {i < pipelineStages.length - 1 && (
                <div className={cn("h-px flex-1", done ? "bg-primary" : "bg-border")} />
              )}
            </div>
            {!compact && (
              <span
                className={cn(
                  "w-full text-[10px] uppercase tracking-wider",
                  current ? "text-primary" : "text-muted-foreground",
                )}
              >
                {titleCase(s)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
