import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { DatabaseIcon, InboxIcon, PlusIcon, RefreshCwIcon } from "lucide-react";
import { rpcClient } from "@/lib/api";
import {
  aggregateQueueStats,
  getAttentionQueues,
} from "@/lib/aggregate-queue-stats";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@unqueue/ui/components/scroll-area";
import {
  EnvironmentQueuesTable,
} from "@/components/environment-queues-table";
import {
  EnvironmentAttentionQueues,
  EnvironmentJobStateBreakdown,
  EnvironmentOverviewStatsGrid,
} from "@/components/environment-overview-stats";
import {
  EnvironmentOverviewContentSkeleton,
  EnvironmentOverviewHeaderSkeleton,
  EnvironmentQueuesTableSkeleton,
} from "@/components/environment-overview-skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@unqueue/ui/components/card";
import { RoutePending } from "@/lib/route-pending";
import { RedisConnectionSheet } from "@/components/redis-connection-sheet";
import {
  environmentQueuesForceRefreshOptions,
  environmentQueuesQueryOptions,
  environmentRedisQueryOptions,
} from "@/lib/environment-queues-query";
import { useEnvironmentQueueSync } from "@/hooks/use-environment-queue-sync";
import { useShellContext } from "@/hooks/use-shell-context";

export const Route = createFileRoute("/$workspaceId/$environmentId/")({
  pendingComponent: RoutePending,
  component: EnvironmentOverview,
});

const SKELETON_ROWS = 8;

function EnvironmentOverview() {
  const { workspaceId, environmentId } = Route.useParams();
  const { workspaceRole } = useShellContext();
  const queryClient = useQueryClient();
  const [connectionSheetOpen, setConnectionSheetOpen] = useState(false);
  const [forceRefreshing, setForceRefreshing] = useState(false);

  const canManage = workspaceRole === "owner" || workspaceRole === "admin";

  const envsQuery = useQuery({
    queryKey: ["environments", workspaceId],
    queryFn: () => rpcClient.environment.list({ workspaceId }),
  });

  const environment = envsQuery.data?.find((e) => e.id === environmentId);

  const redisQuery = useQuery(environmentRedisQueryOptions(environmentId));

  const queuesQuery = useQuery(environmentQueuesQueryOptions(environmentId));

  const queues = useMemo(() => queuesQuery.data ?? [], [queuesQuery.data]);
  const redisInstances = useMemo(() => redisQuery.data ?? [], [redisQuery.data]);
  const redisInstanceIds = useMemo(
    () => redisInstances.map((instance) => instance.id),
    [redisInstances],
  );
  const connectedCount = redisInstances.filter(
    (i) => i.status === "connected",
  ).length;
  const isLoading = redisQuery.isLoading;
  const queuesLoading = queuesQuery.isLoading;
  const isFetching =
    redisQuery.isFetching || queuesQuery.isFetching || forceRefreshing;

  const stats = aggregateQueueStats(queues);
  const attentionQueues = getAttentionQueues(queues);

  useEnvironmentQueueSync(environmentId, queues, redisInstanceIds);

  const refresh = async () => {
    setForceRefreshing(true);
    try {
      await Promise.all([
        redisQuery.refetch(),
        queryClient.fetchQuery(
          environmentQueuesForceRefreshOptions(environmentId),
        ),
      ]);
    } finally {
      setForceRefreshing(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b px-4 py-3">
        <div className="min-w-0 space-y-1">
          {envsQuery.isLoading ? (
            <EnvironmentOverviewHeaderSkeleton />
          ) : (
            <>
              <h1 className="truncate font-medium">
                {environment?.name ?? "Overview"}
              </h1>
              <p className="text-xs text-muted-foreground">
                Queue and job health across this environment
              </p>
            </>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => void refresh()}
          disabled={isFetching}
        >
          <RefreshCwIcon className={isFetching ? "animate-spin" : undefined} />
          Refresh
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-4 p-4">
          {isLoading ? (
            <EnvironmentOverviewContentSkeleton tableRows={SKELETON_ROWS} />
          ) : redisInstances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <DatabaseIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">No connections</p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    Connect the Redis instance your BullMQ workers use to start
                    monitoring queues.
                  </p>
                </div>
                {canManage && (
                  <Button size="sm" onClick={() => setConnectionSheetOpen(true)}>
                    <PlusIcon />
                    Add your first connection
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              <EnvironmentOverviewStatsGrid
                stats={stats}
                connectedRedis={connectedCount}
                totalRedis={redisInstances.length}
              />

              <EnvironmentJobStateBreakdown stats={stats} />

              <EnvironmentAttentionQueues
                queues={attentionQueues}
                workspaceId={workspaceId}
                environmentId={environmentId}
              />

              <Card className="overflow-hidden">
                <CardHeader className="border-b border-border/60 pb-3">
                  <CardTitle className="text-sm font-medium">All queues</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {queuesLoading
                      ? "Discovering queues..."
                      : queues.length === 0
                        ? "No queues discovered yet"
                        : `${queues.length.toLocaleString()} ${queues.length === 1 ? "queue" : "queues"} · ${stats.totalJobs.toLocaleString()} jobs`}
                  </p>
                </CardHeader>
                <CardContent className="p-0">
                  {queuesLoading ? (
                    <EnvironmentQueuesTableSkeleton rows={SKELETON_ROWS} />
                  ) : queues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-2 px-4 py-16 text-center">
                      <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                        <InboxIcon className="size-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm font-medium">No queues found</p>
                      <p className="max-w-xs text-xs text-muted-foreground">
                        BullMQ queues will appear here once workers start using
                        this Redis connection.
                      </p>
                    </div>
                  ) : (
                    <EnvironmentQueuesTable
                      queues={queues}
                      workspaceId={workspaceId}
                      environmentId={environmentId}
                    />
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </ScrollArea>

      <RedisConnectionSheet
        open={connectionSheetOpen}
        onOpenChange={setConnectionSheetOpen}
        mode="create"
        environmentId={environmentId}
        canManage={canManage}
        onSuccess={() => {
          setConnectionSheetOpen(false);
          void queryClient.invalidateQueries({
            queryKey: ["redis", environmentId],
          });
        }}
      />
    </div>
  );
}
