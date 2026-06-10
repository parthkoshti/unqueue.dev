import { Skeleton } from "@/components/ui/skeleton";
import { QueueJobsTableHeader } from "@/components/queue-jobs-table";

const FILTER_STATES = [
  "all",
  "waiting",
  "active",
  "delayed",
  "completed",
  "failed",
  "paused",
] as const;

const tdClass = "px-3 py-2";

function QueueFilterSkeleton() {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-lg bg-muted p-1">
      {FILTER_STATES.map((s) => (
        <Skeleton
          key={s}
          className="h-7 w-[4.75rem] rounded-md capitalize"
        />
      ))}
    </div>
  );
}

function QueueJobsTableSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <table className="w-full text-xs">
      <QueueJobsTableHeader />
      <tbody>
        {Array.from({ length: rows }, (_, i) => (
          <tr key={i} className="border-b border-border/60 last:border-0">
            <td className={`${tdClass} pl-4`}>
              <Skeleton className="size-4 rounded-sm" />
            </td>
            <td className={tdClass}>
              <Skeleton className="h-3.5 w-36" />
            </td>
            <td className={tdClass}>
              <Skeleton className="h-3.5 w-24" />
            </td>
            <td className={tdClass}>
              <Skeleton className="h-3.5 w-24" />
            </td>
            <td className={tdClass}>
              <Skeleton className="h-3.5 w-24" />
            </td>
            <td className={tdClass}>
              <Skeleton className="h-3.5 w-14" />
            </td>
            <td className={tdClass}>
              <Skeleton className="h-5 w-16 rounded-full" />
            </td>
            <td className={`${tdClass} pr-4`}>
              <Skeleton className="ml-auto h-3.5 w-6" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function QueuePaginationSkeleton() {
  return (
    <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5 text-xs">
      <Skeleton className="h-3.5 w-32" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-7 w-16 rounded-md" />
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-7 w-12 rounded-md" />
      </div>
    </div>
  );
}

export function QueuePageSkeleton({ tableRows = 12 }: { tableRows?: number }) {
  return (
    <>
      <QueueFilterSkeleton />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-auto">
          <QueueJobsTableSkeleton rows={tableRows} />
        </div>
        <QueuePaginationSkeleton />
      </div>
    </>
  );
}

export { QueueFilterSkeleton, QueueJobsTableSkeleton, QueuePaginationSkeleton };
