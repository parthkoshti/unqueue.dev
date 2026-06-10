import { InboxIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatJobAttemptsLabel } from "@/lib/format-job-attempts";
import { JobStatusChip } from "@/components/job-status-chip";
import {
  JOB_TIMELINE_GRID_CLASS,
  JobTimeline,
} from "@/components/job-timeline";
import { LucideCheckbox } from "@/components/lucide-checkbox";
import { Skeleton } from "@/components/ui/skeleton";

export type QueueJobRow = {
  id: string;
  name: string;
  state: string;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  attemptsMade: number;
  delay?: number;
  opts?: {
    attempts?: number;
  };
};

const thClass =
  "h-8 px-3 align-middle text-[10px] font-medium uppercase leading-none tracking-wide text-muted-foreground";
const tdClass = "px-3 py-2 align-middle";

const COLUMN_COUNT = 5;
export const QUEUE_TABLE_SKELETON_ROWS = 12;

function QueueJobsTableTimelineSkeleton() {
  return (
    <div className={JOB_TIMELINE_GRID_CLASS}>
      <Skeleton className="h-3.5 w-28 justify-self-end" />
      <Skeleton className="mx-auto size-3 rounded-sm" />
      <Skeleton className="h-5 w-10 justify-self-center rounded-md" />
      <Skeleton className="mx-auto size-3 rounded-sm" />
      <Skeleton className="h-5 w-14 justify-self-center rounded-md" />
      <Skeleton className="mx-auto size-3 rounded-sm" />
      <Skeleton className="h-3.5 w-28 justify-self-start" />
    </div>
  );
}

function QueueJobsTableRowSkeleton() {
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className={cn(tdClass, "w-9 pl-4")}>
        <Skeleton className="size-4 rounded-sm" />
      </td>
      <td className={cn(tdClass, "min-w-[12rem] max-w-[18rem]")}>
        <span className="flex min-w-0 items-baseline gap-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-14 shrink-0" />
        </span>
      </td>
      <td className={cn(tdClass, "min-w-[32rem]")}>
        <QueueJobsTableTimelineSkeleton />
      </td>
      <td className={tdClass}>
        <Skeleton className="h-5 w-[4.5rem] rounded-full" />
      </td>
      <td
        className={cn(
          tdClass,
          "pr-4 text-right text-[11px] text-muted-foreground",
        )}
      >
        <Skeleton className="ml-auto h-3.5 w-20" />
      </td>
    </tr>
  );
}

function QueueJobsTableSkeletonRows({ rows }: { rows: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <QueueJobsTableRowSkeleton key={i} />
      ))}
    </>
  );
}

function QueueJobsTableEmptyRow({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <tr>
      <td colSpan={COLUMN_COUNT} className="px-4 py-16 text-center">
        <div className="flex flex-col items-center justify-center gap-2">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted">
            <InboxIcon className="size-4 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">{title}</p>
          <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
        </div>
      </td>
    </tr>
  );
}

export function QueueJobsTableHeader({
  allSelected = false,
  someSelected = false,
  onToggleSelectAll,
}: {
  allSelected?: boolean;
  someSelected?: boolean;
  onToggleSelectAll?: () => void;
} = {}) {
  return (
    <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm">
      <tr className="border-b border-border text-left">
        <th className={cn(thClass, "w-9 pl-4")}>
          <div className="flex size-4 items-center justify-center">
            {onToggleSelectAll ? (
              <LucideCheckbox
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={onToggleSelectAll}
                aria-label="Select all jobs"
              />
            ) : (
              <span className="sr-only">Select</span>
            )}
          </div>
        </th>
        <th className={thClass}>Job</th>
        <th className={cn(thClass, "min-w-[32rem]")}>
          <div className={JOB_TIMELINE_GRID_CLASS}>
            <span className="col-start-4 flex items-center justify-center">
              Timeline
            </span>
          </div>
        </th>
        <th className={thClass}>Status</th>
        <th className={cn(thClass, "pr-4 text-right")}>Attempts</th>
      </tr>
    </thead>
  );
}

export function QueueJobsTableSkeleton({
  rows = QUEUE_TABLE_SKELETON_ROWS,
}: {
  rows?: number;
}) {
  return (
    <table className="w-full text-xs">
      <QueueJobsTableHeader />
      <tbody>
        <QueueJobsTableSkeletonRows rows={rows} />
      </tbody>
    </table>
  );
}

export function QueueJobsTable({
  jobs,
  selected,
  activeJobId,
  emptyState,
  onToggleSelect,
  onToggleSelectAll,
  onOpenJob,
}: {
  jobs: QueueJobRow[];
  selected: Set<string>;
  activeJobId?: string;
  emptyState?: {
    title: string;
    description: string;
  };
  onToggleSelect: (id: string) => void;
  onToggleSelectAll?: () => void;
  onOpenJob: (id: string) => void;
}) {
  const allSelected =
    jobs.length > 0 && jobs.every((job) => selected.has(job.id));
  const someSelected =
    jobs.some((job) => selected.has(job.id)) && !allSelected;
  const showSelectAll = jobs.length > 0 && onToggleSelectAll;

  return (
    <table className="w-full text-xs">
      <QueueJobsTableHeader
        allSelected={allSelected}
        someSelected={someSelected}
        onToggleSelectAll={showSelectAll ? onToggleSelectAll : undefined}
      />
      <tbody>
        {jobs.length === 0 && emptyState ? (
          <QueueJobsTableEmptyRow
            title={emptyState.title}
            description={emptyState.description}
          />
        ) : null}
        {jobs.map((job) => {
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
              <td className={cn(tdClass, "w-9 pl-4")}>
                <LucideCheckbox
                  checked={isSelected}
                  onCheckedChange={() => onToggleSelect(job.id)}
                  className={cn(
                    "opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100",
                    isSelected && "opacity-100",
                  )}
                />
              </td>
              <td className={cn(tdClass, "min-w-[12rem] max-w-[18rem]")}>
                <span
                  className="block truncate font-medium"
                  title={`${job.name} #${job.id}`}
                >
                  {job.name}
                  <span className="ml-2 font-mono text-[11px] font-normal tabular-nums text-muted-foreground">
                    #{job.id}
                  </span>
                </span>
              </td>
              <td className={cn(tdClass, "min-w-[32rem]")}>
                <JobTimeline job={job} />
              </td>
              <td className={tdClass}>
                <JobStatusChip state={job.state} />
              </td>
              <td
                className={cn(
                  tdClass,
                  "pr-4 text-right text-[11px] text-muted-foreground",
                )}
              >
                <span className="font-mono tabular-nums">
                  {formatJobAttemptsLabel(
                    job.attemptsMade,
                    job.opts?.attempts,
                  )}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
