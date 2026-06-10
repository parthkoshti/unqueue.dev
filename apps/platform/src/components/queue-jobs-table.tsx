import { cn } from "@/lib/utils";
import { JobStatusChip } from "@/components/job-status-chip";
import { LucideCheckbox } from "@/components/lucide-checkbox";
import {
  formatDuration,
  formatJobTimestamp,
} from "@/lib/format-timestamp";

export type QueueJobRow = {
  id: string;
  name: string;
  state: string;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  attemptsMade: number;
};

const thClass =
  "px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground";
const tdClass = "px-3 py-2 align-middle";

export function QueueJobsTableHeader() {
  return (
    <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm">
      <tr className="border-b border-border text-left">
        <th className={cn(thClass, "w-9 pl-4")}>
          <span className="sr-only">Select</span>
        </th>
        <th className={thClass}>Job ID</th>
        <th className={thClass}>Name</th>
        <th className={thClass}>Started</th>
        <th className={thClass}>Finished</th>
        <th className={thClass}>Duration</th>
        <th className={thClass}>Status</th>
        <th className={cn(thClass, "pr-4 text-right")}>Attempts</th>
      </tr>
    </thead>
  );
}

export function QueueJobsTable({
  jobs,
  selected,
  activeJobId,
  onToggleSelect,
  onOpenJob,
}: {
  jobs: QueueJobRow[];
  selected: Set<string>;
  activeJobId?: string;
  onToggleSelect: (id: string) => void;
  onOpenJob: (id: string) => void;
}) {
  return (
    <table className="w-full text-xs">
      <QueueJobsTableHeader />
      <tbody>
        {jobs.map((job) => {
          const started = formatJobTimestamp(job.processedOn ?? job.timestamp);
          const finished = formatJobTimestamp(job.finishedOn);
          const isSelected = selected.has(job.id);
          const isActive = activeJobId === job.id;

          return (
            <tr
              key={job.id}
              className={cn(
                "group cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40",
                isActive && "bg-accent/60 hover:bg-accent/60",
                isSelected && !isActive && "bg-primary/5",
              )}
              onClick={() => onOpenJob(job.id)}
            >
              <td className={cn(tdClass, "pl-4")}>
                <LucideCheckbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelect(job.id)}
                />
              </td>
              <td
                className={cn(
                  tdClass,
                  "max-w-[11rem] truncate font-mono text-[11px] text-muted-foreground",
                )}
                title={job.id}
              >
                {job.id}
              </td>
              <td className={cn(tdClass, "max-w-[10rem] truncate font-medium")}>
                {job.name}
              </td>
              <td
                className={cn(
                  tdClass,
                  "whitespace-nowrap font-mono text-[11px] tabular-nums text-muted-foreground",
                )}
                title={started.title}
              >
                {started.label}
              </td>
              <td
                className={cn(
                  tdClass,
                  "whitespace-nowrap font-mono text-[11px] tabular-nums text-muted-foreground",
                )}
                title={finished.title}
              >
                {finished.label}
              </td>
              <td
                className={cn(
                  tdClass,
                  "whitespace-nowrap font-mono text-[11px] tabular-nums",
                )}
              >
                {formatDuration(job.processedOn, job.finishedOn)}
              </td>
              <td className={tdClass}>
                <JobStatusChip state={job.state} />
              </td>
              <td
                className={cn(
                  tdClass,
                  "pr-4 text-right font-mono text-[11px] tabular-nums text-muted-foreground",
                )}
              >
                {job.attemptsMade}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
