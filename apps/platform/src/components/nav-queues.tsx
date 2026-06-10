import { Link, useMatchRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { CircleCheckIcon, LayersIcon, PauseIcon, SearchIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EnvironmentQueueRow } from "@/components/environment-queues-table";
import { Input } from "@/components/ui/input";
import {
  environmentQueuesQueryOptions,
  environmentRedisQueryOptions,
} from "@/lib/environment-queues-query";
import { useEnvironmentQueueSync } from "@/hooks/use-environment-queue-sync";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";

const MAX_VISIBLE_QUEUES = 15;

type QueueHealth = "failed" | "paused" | "backlog" | "active" | "idle";

const HEALTH_DOT: Record<QueueHealth, string> = {
  failed: "bg-destructive",
  paused: "bg-amber-500",
  backlog: "bg-sky-500",
  active: "bg-blue-500",
  idle: "bg-emerald-500/50",
};

function sortQueuesForNav(queues: EnvironmentQueueRow[]) {
  return [...queues].sort((a, b) => {
    const failedDiff = b.counts.failed - a.counts.failed;
    return failedDiff !== 0 ? failedDiff : a.name.localeCompare(b.name);
  });
}

function getQueueHealth(queue: EnvironmentQueueRow): QueueHealth {
  if (queue.counts.failed > 0) return "failed";
  if (queue.isPaused) return "paused";
  if (queue.counts.waiting + queue.counts.delayed >= 10) return "backlog";
  if (queue.counts.active > 0) return "active";
  return "idle";
}

function formatMetric(value: number) {
  return value > 99 ? "99+" : value.toLocaleString();
}

function formatFailedCount(value: number) {
  if (value < 1_000) {
    return value.toLocaleString();
  }

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    compactDisplay: "short",
    maximumSignificantDigits: 3,
  }).format(value);
}

function queueTooltip(queue: EnvironmentQueueRow) {
  const parts = [
    `${queue.counts.active} active`,
    `${queue.counts.waiting} waiting`,
    `${queue.counts.delayed} delayed`,
    `${queue.counts.failed} failed`,
  ];
  if (queue.isPaused) parts.unshift("Paused");
  return `${queue.name} · ${parts.join(" · ")}`;
}

function QueueNavMetrics({ queue }: { queue: EnvironmentQueueRow }) {
  const failed = queue.counts.failed;
  const active = queue.counts.active;
  const backlog = queue.counts.waiting + queue.counts.delayed;

  return (
    <span className="ml-auto flex shrink-0 items-center gap-1">
      {queue.isPaused && (
        <span
          className="flex size-4 items-center justify-center rounded-sm bg-amber-500/15"
          title="Paused"
        >
          <PauseIcon className="size-2.5 text-amber-600 dark:text-amber-400" />
        </span>
      )}
      {active > 0 && (
        <span className="rounded-sm bg-blue-500/10 px-1 font-mono text-[10px] tabular-nums text-blue-600 dark:text-blue-400">
          {formatMetric(active)}
        </span>
      )}
      {failed > 0 && (
        <span className="min-w-4 rounded-sm bg-destructive/15 px-1 text-center font-mono text-[10px] font-medium tabular-nums text-destructive">
          {formatFailedCount(failed)}
        </span>
      )}
      {failed === 0 && backlog >= 10 && (
        <span className="rounded-sm bg-sky-500/10 px-1 font-mono text-[10px] tabular-nums text-sky-600 dark:text-sky-400">
          {formatMetric(backlog)}
        </span>
      )}
    </span>
  );
}

export function NavQueues({
  workspaceId,
  environmentId,
}: {
  workspaceId: string;
  environmentId: string;
}) {
  const matchRoute = useMatchRoute();
  const [filter, setFilter] = useState("");

  const redisQuery = useQuery(environmentRedisQueryOptions(environmentId));

  const queuesQuery = useQuery(environmentQueuesQueryOptions(environmentId));

  const queues = queuesQuery.data ?? [];
  const redisInstanceIds = (redisQuery.data ?? []).map((instance) => instance.id);
  const isLoading = queuesQuery.isLoading;

  useEnvironmentQueueSync(environmentId, queues, redisInstanceIds);
  const normalizedFilter = filter.trim().toLowerCase();

  const sortedQueues = useMemo(() => sortQueuesForNav(queues), [queues]);

  const filteredQueues = useMemo(() => {
    if (!normalizedFilter) return sortedQueues;
    return sortedQueues.filter((queue) =>
      queue.name.toLowerCase().includes(normalizedFilter),
    );
  }, [sortedQueues, normalizedFilter]);

  const visibleQueues = normalizedFilter
    ? filteredQueues
    : filteredQueues.slice(0, MAX_VISIBLE_QUEUES);
  const hiddenCount = normalizedFilter
    ? 0
    : Math.max(0, filteredQueues.length - MAX_VISIBLE_QUEUES);
  const pausedCount = queues.filter((queue) => queue.isPaused).length;
  const healthyCount = queues.length - pausedCount;

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel className="flex items-center justify-between gap-2">
        <span>Queues</span>
        {!isLoading && queues.length > 0 && (
          <Link
            to="/$workspaceId/$environmentId"
            params={{ workspaceId, environmentId }}
            className="inline-flex items-center gap-1.5 font-normal tabular-nums text-sidebar-foreground/50 transition-colors hover:text-sidebar-foreground"
            title={`${healthyCount} healthy · ${pausedCount} paused · ${queues.length} total`}
          >
            <span className="inline-flex items-center gap-0.5">
              <CircleCheckIcon
                className="size-3 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
              <span className="text-emerald-600 dark:text-emerald-400">
                {healthyCount}
              </span>
            </span>
            <span className="text-sidebar-foreground/25" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-0.5">
              <PauseIcon
                className="size-3 text-amber-600 dark:text-amber-400"
                aria-hidden
              />
              <span className="text-amber-600 dark:text-amber-400">
                {pausedCount}
              </span>
            </span>
            <span className="text-sidebar-foreground/25" aria-hidden>
              ·
            </span>
            <span className="inline-flex items-center gap-0.5">
              <LayersIcon
                className="size-3 text-sidebar-foreground/50"
                aria-hidden
              />
              <span>{queues.length}</span>
            </span>
          </Link>
        )}
      </SidebarGroupLabel>

      <SidebarGroupContent>
        {!isLoading && queues.length > 0 && (
          <div className="relative mb-1 px-2">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter queues..."
              className="h-7 border-sidebar-border bg-sidebar-accent/30 pl-7 text-xs shadow-none focus-visible:ring-1"
            />
          </div>
        )}

        <SidebarMenu>
          {isLoading ? (
            Array.from({ length: 5 }, (_, i) => (
              <SidebarMenuItem key={i}>
                <SidebarMenuSkeleton showIcon />
              </SidebarMenuItem>
            ))
          ) : queues.length === 0 ? (
            <SidebarMenuItem>
              <span className="px-2 py-1.5 text-xs text-sidebar-foreground/50">
                No queues found
              </span>
            </SidebarMenuItem>
          ) : visibleQueues.length === 0 ? (
            <SidebarMenuItem>
              <span className="px-2 py-1.5 text-xs text-sidebar-foreground/50">
                No queues match &ldquo;{filter}&rdquo;
              </span>
            </SidebarMenuItem>
          ) : (
            visibleQueues.map((queue) => {
              const isActive = !!matchRoute({
                to: "/$workspaceId/$environmentId/queues/$queueName",
                params: {
                  workspaceId,
                  environmentId,
                  queueName: queue.name,
                },
              });
              const health = getQueueHealth(queue);

              return (
                <SidebarMenuItem key={`${queue.redisInstanceId}-${queue.name}`}>
                  <SidebarMenuButton
                    asChild
                    size="sm"
                    isActive={isActive}
                    tooltip={queueTooltip(queue)}
                    className="gap-1.5 pr-1"
                  >
                    <Link
                      to="/$workspaceId/$environmentId/queues/$queueName"
                      params={{
                        workspaceId,
                        environmentId,
                        queueName: queue.name,
                      }}
                      search={{ redisInstanceId: queue.redisInstanceId }}
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          HEALTH_DOT[health],
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1 truncate font-mono text-[11px]">
                        {queue.name}
                      </span>
                      <QueueNavMetrics queue={queue} />
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })
          )}

          {hiddenCount > 0 && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild size="sm" className="text-sidebar-foreground/50">
                <Link
                  to="/$workspaceId/$environmentId"
                  params={{ workspaceId, environmentId }}
                >
                  <span className="pl-3.5 text-xs">
                    +{hiddenCount} more on overview
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
