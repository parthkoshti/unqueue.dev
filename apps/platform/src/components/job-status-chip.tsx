import { cn } from "@/lib/utils";

const STATUS_CHIP_CLASS: Record<string, string> = {
  waiting:
    "bg-sky-500/15 text-sky-700 ring-1 ring-inset ring-sky-500/25 dark:text-sky-300",
  active:
    "bg-blue-500/15 text-blue-700 ring-1 ring-inset ring-blue-500/25 dark:text-blue-300",
  delayed:
    "bg-amber-500/15 text-amber-800 ring-1 ring-inset ring-amber-500/25 dark:text-amber-300",
  completed:
    "bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-300",
  failed:
    "bg-destructive/15 text-destructive ring-1 ring-inset ring-destructive/25",
  paused:
    "bg-orange-500/15 text-orange-800 ring-1 ring-inset ring-orange-500/25 dark:text-orange-300",
  prioritized:
    "bg-violet-500/15 text-violet-700 ring-1 ring-inset ring-violet-500/25 dark:text-violet-300",
  "waiting-children":
    "bg-cyan-500/15 text-cyan-700 ring-1 ring-inset ring-cyan-500/25 dark:text-cyan-300",
};

export function JobStatusChip({
  state,
  label,
}: {
  state: string;
  label?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
        STATUS_CHIP_CLASS[state] ??
          "bg-muted text-muted-foreground ring-1 ring-inset ring-border",
      )}
    >
      {label ?? state}
    </span>
  );
}
