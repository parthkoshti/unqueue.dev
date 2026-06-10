import { cn } from "@/lib/utils";

export type QueueStatus = "running" | "paused";

const QUEUE_STATUS_CLASS: Record<QueueStatus, string> = {
  running:
    "bg-emerald-500/15 text-emerald-700 ring-1 ring-inset ring-emerald-500/25 dark:text-emerald-300",
  paused:
    "bg-destructive/15 text-destructive ring-1 ring-inset ring-destructive/25",
};

const QUEUE_STATUS_LABEL: Record<QueueStatus, string> = {
  running: "Running",
  paused: "Paused",
};

export function QueueStatusChip({ status }: { status: QueueStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium",
        QUEUE_STATUS_CLASS[status],
      )}
    >
      {QUEUE_STATUS_LABEL[status]}
    </span>
  );
}
