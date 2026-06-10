import { QUEUE_STATE_TABS } from "@/components/queue-page-toolbar";
import {
  QueueJobsTableSkeleton,
  QUEUE_TABLE_SKELETON_ROWS,
} from "@/components/queue-jobs-table";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function QueueMetricsPanelSkeleton() {
  return (
    <div className="shrink-0 space-y-4 border-b py-4">
      <div className="flex flex-wrap gap-1.5 px-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>
      <div className="grid w-full grid-cols-2 gap-0 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            className={cn(
              "min-w-0 w-full space-y-1 border-t border-r border-b-0 border-border px-3 py-2.5",
              "max-sm:odd:border-l sm:first:border-l",
            )}
          >
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
        ))}
      </div>
    </div>
  );
}

function QueueStateTabsSkeleton() {
  return (
    <div className="shrink-0">
      <div className="grid h-auto w-full grid-cols-3 items-stretch gap-0 sm:grid-cols-5 xl:grid-cols-10">
        {QUEUE_STATE_TABS.map((tab) => (
          <div
            key={tab.state}
            className={cn(
              "flex min-h-14 w-full min-w-0 flex-col items-start justify-center gap-1.5 border-t border-r border-b-0 border-border/60 px-3 py-3",
              "max-sm:nth-[3n+1]:border-l sm:max-xl:nth-[5n+1]:border-l xl:nth-[10n+1]:border-l",
              "whitespace-normal",
            )}
          >
            <div className="flex w-full min-w-0 items-center justify-between gap-2">
              <Skeleton className="h-3 w-14" />
              <Skeleton className="size-3.5 rounded-sm" />
            </div>
            <Skeleton className="h-4 w-14 rounded-sm" />
          </div>
        ))}
      </div>
    </div>
  );
}

function QueueJobsFooterSkeleton() {
  return (
    <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5 text-xs">
      <Skeleton className="h-3.5 w-32" />
    </div>
  );
}

export function QueuePageSkeleton({
  tableRows = QUEUE_TABLE_SKELETON_ROWS,
}: {
  tableRows?: number;
}) {
  return (
    <>
      <QueueMetricsPanelSkeleton />
      <QueueStateTabsSkeleton />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t bg-card">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-none">
          <QueueJobsTableSkeleton rows={tableRows} />
        </div>
        <QueueJobsFooterSkeleton />
      </div>
    </>
  );
}

export {
  QueueMetricsPanelSkeleton,
  QueueStateTabsSkeleton,
  QueueJobsFooterSkeleton,
};
