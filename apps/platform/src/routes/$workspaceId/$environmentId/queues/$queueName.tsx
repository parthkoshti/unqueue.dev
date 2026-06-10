import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  InboxIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { z } from "zod";
import { rpcClient } from "@/lib/api";
import { applyQueueCountsPatch } from "@/lib/queue-cache-updates";
import { useShellContext } from "@/hooks/use-shell-context";
import {
  onResync,
  onSocketEvent,
  subscribeRooms,
  unsubscribeRooms,
} from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@unstall/ui/components/scroll-area";
import { JobDetailPanel } from "@/components/job-detail-panel";
import { QueueJobsTable } from "@/components/queue-jobs-table";
import { QueueJobsTableSkeleton } from "@/components/queue-page-skeleton";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { RoutePending } from "@/lib/route-pending";
import {
  type QueueJobFilterState,
  QueueMetricsPanel,
  QueuePageHeader,
  QueueStateTabs,
} from "@/components/queue-page-toolbar";

const PAGE_SIZE = 100;
const SKELETON_ROWS = 12;

const jobFilterStates = [
  "completed",
  "failed",
  "active",
  "prioritized",
  "waiting",
  "waiting-children",
  "delayed",
  "paused",
  "schedulers",
] as const;

const searchSchema = z.object({
  redisInstanceId: z.string(),
  state: z
    .union([z.enum(jobFilterStates), z.literal("all")])
    .transform((value) => (value === "all" ? "active" : value))
    .default("active"),
  jobId: z.string().optional(),
});

export const Route = createFileRoute(
  "/$workspaceId/$environmentId/queues/$queueName",
)({
  validateSearch: searchSchema,
  pendingComponent: RoutePending,
  component: QueuePage,
});

function getStateCount(
  counts:
    | {
        waiting: number;
        active: number;
        delayed: number;
        completed: number;
        failed: number;
        paused: number;
        prioritized: number;
        "waiting-children": number;
        schedulers: number;
      }
    | undefined,
  state: QueueJobFilterState,
) {
  if (!counts) return 0;
  return counts[state] ?? 0;
}

function QueuePage() {
  const { workspaceId, environmentId, queueName } = Route.useParams();
  const { redisInstanceId, state, jobId: jobIdFromSearch } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [metricsWindow, setMetricsWindow] = useState<
    "1m" | "1h" | "24h" | "7d"
  >("1h");
  const [sheetJobId, setSheetJobId] = useState<string | undefined>(
    jobIdFromSearch,
  );

  useEffect(() => {
    setSheetJobId(jobIdFromSearch);
  }, [jobIdFromSearch]);

  useEffect(() => {
    setSelected(new Set());
  }, [state]);

  const { workspaceRole } = useShellContext();
  const canWrite = workspaceRole !== undefined && workspaceRole !== "viewer";

  const queueMetaQuery = useQuery({
    queryKey: ["queue-meta", redisInstanceId, queueName],
    queryFn: () =>
      rpcClient.queue.getMeta({
        redisInstanceId,
        queueName,
        forceRefresh: true,
      }),
  });

  const metricsQuery = useQuery({
    queryKey: ["queue-metrics", redisInstanceId, queueName, metricsWindow],
    queryFn: () =>
      rpcClient.queue.getMetrics({
        redisInstanceId,
        queueName,
        window: metricsWindow,
      }),
    enabled: !!queueMetaQuery.data,
  });

  const stateCount = getStateCount(queueMetaQuery.data?.counts, state);
  const isPaused = queueMetaQuery.data?.isPaused ?? false;

  const jobsQuery = useInfiniteQuery({
    queryKey: ["jobs", redisInstanceId, queueName, state],
    queryFn: ({ pageParam }) =>
      rpcClient.job.list({
        redisInstanceId,
        queueName,
        state,
        start: pageParam * PAGE_SIZE,
        end: pageParam * PAGE_SIZE + PAGE_SIZE - 1,
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, _allPages, lastPageParam) =>
      lastPage.length < PAGE_SIZE ? undefined : lastPageParam + 1,
    enabled: !queueMetaQuery.isLoading && state !== "schedulers",
  });

  const jobs = jobsQuery.data?.pages.flat() ?? [];
  const fetchedCount = jobs.length;

  useEffect(() => {
    const room = `queue:${redisInstanceId}:${queueName}`;

    const offEvent = onSocketEvent((data) => {
      if (data.room !== room) return;
      if (data.type === "job:update" || data.type === "job:removed") {
        void queryClient.invalidateQueries({
          queryKey: ["jobs", redisInstanceId, queueName],
        });
      }
      if (data.type === "queue:counts") {
        applyQueueCountsPatch(
          queryClient,
          environmentId,
          data.room,
          data.payload,
        );
        const payload = data.payload as {
          counts?: NonNullable<typeof queueMetaQuery.data>["counts"];
          isPaused?: boolean;
        };
        if (payload.counts) {
          queryClient.setQueryData(
            ["queue-meta", redisInstanceId, queueName],
            (old: typeof queueMetaQuery.data) =>
              old
                ? {
                    ...old,
                    counts: payload.counts!,
                    isPaused: payload.isPaused ?? old.isPaused,
                  }
                : old,
          );
        }
      }
      if (data.type === "metrics:update") {
        void queryClient.invalidateQueries({
          queryKey: ["queue-metrics", redisInstanceId, queueName],
        });
      }
    });

    const offResync = onResync((data) => {
      if (data.room === room) {
        void queryClient.invalidateQueries({
          queryKey: ["jobs", redisInstanceId, queueName],
        });
        void queryClient.invalidateQueries({
          queryKey: ["queue-meta", redisInstanceId, queueName],
        });
      }
    });

    subscribeRooms([room]);

    return () => {
      offEvent();
      offResync();
      unsubscribeRooms([room]);
    };
  }, [environmentId, redisInstanceId, queueName, queryClient]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bulkRetry = async () => {
    await rpcClient.jobActions.bulkRetry({
      redisInstanceId,
      queueName,
      jobIds: [...selected],
    });
    setSelected(new Set());
    jobsQuery.refetch();
  };

  const bulkRemove = async () => {
    await rpcClient.jobActions.bulkRemove({
      redisInstanceId,
      queueName,
      jobIds: [...selected],
    });
    setSelected(new Set());
    jobsQuery.refetch();
  };

  const refresh = () => {
    void queueMetaQuery.refetch();
    void metricsQuery.refetch();
    void jobsQuery.refetch();
  };

  const isLoadingJobs = queueMetaQuery.isLoading || jobsQuery.isLoading;
  const isEmpty =
    !isLoadingJobs && (state === "schedulers" || fetchedCount === 0);
  const isFetching =
    queueMetaQuery.isFetching ||
    metricsQuery.isFetching ||
    jobsQuery.isFetching;

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = jobsQuery;

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasNextPage) return;

    const viewport = sentinel.closest("[data-radix-scroll-area-viewport]");

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root: viewport, rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, fetchedCount]);

  const closeJobSheet = () => {
    setSheetJobId(undefined);
    void navigate({
      to: "/$workspaceId/$environmentId/queues/$queueName",
      params: { workspaceId, environmentId, queueName },
      search: { redisInstanceId, state },
      replace: true,
    });
  };

  const openJobSheet = (id: string) => {
    setSheetJobId(id);
    void navigate({
      to: "/$workspaceId/$environmentId/queues/$queueName",
      params: { workspaceId, environmentId, queueName },
      search: {
        redisInstanceId,
        state,
        jobId: id,
      },
      replace: true,
    });
  };

  const selectState = (nextState: QueueJobFilterState) => {
    void navigate({
      to: "/$workspaceId/$environmentId/queues/$queueName",
      params: { workspaceId, environmentId, queueName },
      search: {
        redisInstanceId,
        state: nextState,
      },
    });
  };

  return (
    <div className="flex h-full flex-col">
      <QueuePageHeader
        queueName={queueName}
        isPaused={isPaused}
        isFetching={isFetching}
        canWrite={canWrite}
        onRefresh={refresh}
        onPause={() =>
          void rpcClient.queueAdmin.pause({ redisInstanceId, queueName })
        }
        onResume={() =>
          void rpcClient.queueAdmin.resume({ redisInstanceId, queueName })
        }
      />

      <QueueMetricsPanel
        window={metricsWindow}
        metrics={metricsQuery.data}
        isLoading={metricsQuery.isLoading}
        onWindowChange={setMetricsWindow}
      />

      <QueueStateTabs
        state={state}
        counts={queueMetaQuery.data?.counts}
        isLoading={queueMetaQuery.isLoading}
        onStateChange={selectState}
      />

      {selected.size > 0 && (
        <div className="flex shrink-0 items-center gap-1.5 border-b px-4 py-2">
          <Button size="sm" variant="outline" onClick={() => void bulkRetry()}>
            <RotateCcwIcon />
            Retry ({selected.size})
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => void bulkRemove()}
          >
            <Trash2Icon />
            Remove ({selected.size})
          </Button>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t bg-card">
        <ScrollArea className="min-h-0 flex-1">
          {isLoadingJobs ? (
            <QueueJobsTableSkeleton rows={SKELETON_ROWS} />
          ) : isEmpty ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <InboxIcon className="size-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">
                {state === "schedulers"
                  ? "No schedulers"
                  : `No ${state.replace("-", " ")} jobs`}
              </p>
              <p className="max-w-xs text-xs text-muted-foreground">
                {state === "schedulers"
                  ? "Repeatable job schedulers will appear here when configured."
                  : `There are no jobs in the ${state.replace("-", " ")} state right now.`}
              </p>
            </div>
          ) : (
            <>
              <QueueJobsTable
                jobs={jobs}
                selected={selected}
                activeJobId={sheetJobId}
                onToggleSelect={toggleSelect}
                onOpenJob={openJobSheet}
              />
              <div ref={loadMoreRef} className="h-px" aria-hidden />
            </>
          )}
        </ScrollArea>

        {!isLoadingJobs && fetchedCount > 0 && state !== "schedulers" && (
          <div className="flex shrink-0 items-center justify-between border-t border-border bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {fetchedCount.toLocaleString()} of {stateCount.toLocaleString()}{" "}
              loaded
            </span>
            {jobsQuery.isFetchingNextPage && (
              <span className="flex items-center gap-1.5">
                <RefreshCwIcon className="size-3 animate-spin" />
                Loading more
              </span>
            )}
          </div>
        )}
      </div>

      <Sheet
        open={!!sheetJobId}
        onOpenChange={(open) => {
          if (!open) closeJobSheet();
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 overflow-hidden p-0 data-[side=right]:sm:max-w-2xl"
        >
          {sheetJobId && (
            <JobDetailPanel
              workspaceId={workspaceId}
              environmentId={environmentId}
              redisInstanceId={redisInstanceId}
              queueName={queueName}
              jobId={sheetJobId}
              canWrite={canWrite}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
