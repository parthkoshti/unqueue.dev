import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  RefreshCwIcon,
  RotateCcwIcon,
  Trash2Icon,
} from "lucide-react";
import { z } from "zod";
import { rpcClient } from "@/lib/api";
import {
  applyLatestJobRemoved,
  applyLatestJobUpdate,
  applyQueueCountsPatch,
  type LatestJobSummary,
} from "@/lib/queue-cache-updates";
import { useShellContext } from "@/hooks/use-shell-context";
import {
  onResync,
  onSocketEvent,
  subscribeRooms,
  unsubscribeRooms,
} from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { JobDetailPanel } from "@/components/job-detail-panel";
import {
  QueueJobsTable,
  QueueJobsTableSkeleton,
  QUEUE_TABLE_SKELETON_ROWS,
} from "@/components/queue-jobs-table";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { RoutePending } from "@/lib/route-pending";
import {
  getQueueTabJobCount,
  getQueueTabEmptyState,
  type QueueJobFilterState,
  QueueMetricsPanel,
  QueuePageHeader,
  QueueStateTabs,
} from "@/components/queue-page-toolbar";

const PAGE_SIZE = 100;
const LOAD_MORE_MIN_THRESHOLD_PX = 600;

const jobFilterStates = [
  "latest",
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
    .transform((value) => (value === "all" ? "latest" : value))
    .default("latest"),
  jobId: z.string().optional(),
});

export const Route = createFileRoute(
  "/$workspaceId/$environmentId/queues/$queueName",
)({
  validateSearch: searchSchema,
  pendingComponent: RoutePending,
  component: QueuePage,
});

function QueuePage() {
  const { workspaceId, environmentId, queueName } = Route.useParams();
  const { redisInstanceId, state, jobId: jobIdFromSearch } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFetchingNextPageRef = useRef(false);
  const hasNextPageRef = useRef(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectingAll, setSelectingAll] = useState(false);
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
    setSelectingAll(false);
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

  const stateCount = getQueueTabJobCount(queueMetaQuery.data?.counts, state);
  const isPaused = queueMetaQuery.data?.isPaused ?? false;

  const jobsQuery = useInfiniteQuery({
    queryKey: ["jobs", redisInstanceId, queueName, state],
    queryFn: ({ pageParam }) =>
      rpcClient.job.list({
        redisInstanceId,
        queueName,
        state: state === "latest" ? "all" : state,
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
      if (data.type === "job:update") {
        const payload = data.payload as { job?: LatestJobSummary };
        if (payload.job) {
          applyLatestJobUpdate(
            queryClient,
            redisInstanceId,
            queueName,
            payload.job,
          );
        }
        if (state !== "latest") {
          void queryClient.invalidateQueries({
            queryKey: ["jobs", redisInstanceId, queueName, state],
          });
        }
      }
      if (data.type === "job:removed") {
        const payload = data.payload as { jobId?: string };
        if (payload.jobId) {
          applyLatestJobRemoved(
            queryClient,
            redisInstanceId,
            queueName,
            payload.jobId,
          );
        }
        if (state !== "latest") {
          void queryClient.invalidateQueries({
            queryKey: ["jobs", redisInstanceId, queueName, state],
          });
        }
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
          queryKey: ["jobs", redisInstanceId, queueName, state],
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
  }, [environmentId, redisInstanceId, queueName, queryClient, state]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected((prev) => {
      const allSelected =
        jobs.length > 0 && jobs.every((job) => prev.has(job.id));
      if (allSelected) return new Set();
      return new Set(jobs.map((job) => job.id));
    });
  };

  const selectAll = async () => {
    setSelectingAll(true);
    try {
      const ids = await rpcClient.job.listIds({
        redisInstanceId,
        queueName,
        state: state === "latest" ? "all" : state,
      });
      setSelected(new Set(ids));
    } finally {
      setSelectingAll(false);
    }
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

  const isLoadingJobs =
    queueMetaQuery.isPending ||
    (state !== "schedulers" && jobsQuery.isPending);
  const isEmpty = !isLoadingJobs && fetchedCount === 0;
  const isFetching =
    queueMetaQuery.isFetching ||
    metricsQuery.isFetching ||
    jobsQuery.isFetching;

  const { fetchNextPage, hasNextPage, isFetchingNextPage } = jobsQuery;

  isFetchingNextPageRef.current = isFetchingNextPage;
  hasNextPageRef.current = hasNextPage;

  const minJobsToLoad = Math.min(PAGE_SIZE, stateCount);

  useEffect(() => {
    if (state === "schedulers" || isLoadingJobs || isFetchingNextPage) return;
    if (!hasNextPage || fetchedCount >= minJobsToLoad) return;
    void fetchNextPage();
  }, [
    state,
    isLoadingJobs,
    isFetchingNextPage,
    hasNextPage,
    fetchedCount,
    minJobsToLoad,
    fetchNextPage,
  ]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isLoadingJobs) return;

    const maybeLoadMore = () => {
      if (!hasNextPageRef.current || isFetchingNextPageRef.current) return;
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      const threshold = Math.max(
        LOAD_MORE_MIN_THRESHOLD_PX,
        el.clientHeight * 2,
      );
      if (remaining < threshold) {
        void fetchNextPage();
      }
    };

    el.addEventListener("scroll", maybeLoadMore, { passive: true });

    const resizeObserver = new ResizeObserver(maybeLoadMore);
    resizeObserver.observe(el);
    for (const child of el.children) {
      resizeObserver.observe(child);
    }

    maybeLoadMore();

    return () => {
      el.removeEventListener("scroll", maybeLoadMore);
      resizeObserver.disconnect();
    };
  }, [fetchNextPage, fetchedCount, state, isLoadingJobs]);

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
    <div className="flex h-full flex-col overflow-hidden">
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

      {(() => {
        const hasSelection = selected.size > 0;
        const allMatchSelected = selected.size >= stateCount && stateCount > 0;
        return (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-b px-4 py-2">
            <div className="flex items-center gap-3 text-xs">
              {hasSelection ? (
                <>
                  <span className="text-muted-foreground">
                    {selected.size.toLocaleString()} selected
                  </span>
                  {!allMatchSelected ? (
                    <button
                      type="button"
                      disabled={selectingAll}
                      className="flex items-center gap-1 text-primary underline-offset-2 hover:underline disabled:opacity-50"
                      onClick={() => void selectAll()}
                    >
                      {selectingAll && <RefreshCwIcon className="size-3 animate-spin" />}
                      Select all {stateCount.toLocaleString()}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="text-muted-foreground underline-offset-2 hover:underline"
                      onClick={() => setSelected(new Set())}
                    >
                      Clear
                    </button>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground/50">No jobs selected</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" disabled={!hasSelection} onClick={() => void bulkRetry()}>
                <RotateCcwIcon />
                Retry {hasSelection ? `(${selected.size})` : ""}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={!hasSelection}
                onClick={() => void bulkRemove()}
              >
                <Trash2Icon />
                Remove {hasSelection ? `(${selected.size})` : ""}
              </Button>
            </div>
          </div>
        );
      })()}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t bg-card">
        <div
          ref={scrollRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-y-none"
        >
          {isLoadingJobs ? (
            <QueueJobsTableSkeleton rows={QUEUE_TABLE_SKELETON_ROWS} />
          ) : (
            <QueueJobsTable
              jobs={jobs}
              selected={selected}
              activeJobId={sheetJobId}
              emptyState={isEmpty ? getQueueTabEmptyState(state) : undefined}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              onOpenJob={openJobSheet}
            />
          )}
        </div>

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
