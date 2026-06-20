import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useMemo } from "react";
import {
  ActivityIcon,
  BarChart2Icon,
  ChevronDownIcon,
  ClockIcon,
  InboxIcon,
  TrendingDownIcon,
  ZapIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { rpcClient } from "@/lib/api";
import {
  environmentQueuesQueryOptions,
  environmentRedisQueryOptions,
} from "@/lib/environment-queues-query";
import { useEnvironmentQueueSync } from "@/hooks/use-environment-queue-sync";
import type { EnvironmentQueueRow } from "@/components/environment-queues-table";
import type { QueueMetrics } from "@unqueue/bullmq";
import { QueueStatusChip, type QueueStatus } from "@/components/queue-status-chip";
import { RedisIcon } from "@/components/icons/redis";
import { ScrollArea } from "@unqueue/ui/components/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RoutePending } from "@/lib/route-pending";
import { onSocketEvent } from "@/lib/socket";

export const Route = createFileRoute("/$workspaceId/$environmentId/stats")({
  pendingComponent: RoutePending,
  component: StatsPage,
});

// ─── formatting ──────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString();
}

function fmtRate(r: number) {
  const pct = r * 100;
  return `${pct < 0.1 && pct > 0 ? "<0.1" : pct.toFixed(1)}%`;
}

function fmtMs(ms: number) {
  if (ms === 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtThroughput(n: number) {
  if (n === 0) return "0/min";
  if (n < 0.1) return "<0.1/min";
  return `${n.toFixed(1)}/min`;
}

// ─── live metrics hook ────────────────────────────────────────────────────────

function parseQueueRoom(
  room: string,
): { redisInstanceId: string; queueName: string } | null {
  if (!room.startsWith("queue:")) return null;
  const rest = room.slice("queue:".length);
  const sep = rest.indexOf(":");
  if (sep === -1) return null;
  return {
    redisInstanceId: rest.slice(0, sep),
    queueName: rest.slice(sep + 1),
  };
}

function useQueueMetricsLive(queues: EnvironmentQueueRow[]) {
  const [metrics, setMetrics] = useState<Record<string, QueueMetrics>>({});

  useEffect(() => {
    if (queues.length === 0) return;
    let cancelled = false;

    void Promise.all(
      queues.map(async (q) => {
        try {
          const key = `${q.redisInstanceId}:${q.name}`;
          const m = await rpcClient.queue.getMetrics({
            redisInstanceId: q.redisInstanceId,
            queueName: q.name,
            window: "5m",
          });
          if (!cancelled) {
            setMetrics((prev) => ({ ...prev, [key]: m }));
          }
        } catch {}
      }),
    );

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queues.map((q) => `${q.redisInstanceId}:${q.name}`).join(",")]);

  useEffect(() => {
    return onSocketEvent((data) => {
      if (data.type !== "metrics:update") return;
      const parsed = parseQueueRoom(data.room);
      if (!parsed) return;
      const key = `${parsed.redisInstanceId}:${parsed.queueName}`;
      const payload = data.payload as { metrics?: QueueMetrics };
      if (!payload?.metrics) return;
      setMetrics((prev) => ({ ...prev, [key]: payload.metrics! }));
    });
  }, []);

  return metrics;
}

// ─── summary cards ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "default",
  loading,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tone?: "default" | "blue" | "amber" | "destructive" | "emerald";
  loading?: boolean;
}) {
  const valueClass = {
    default: "",
    blue: "text-blue-600 dark:text-blue-400",
    amber: "text-amber-600 dark:text-amber-400",
    destructive: "text-destructive",
    emerald: "text-emerald-600 dark:text-emerald-400",
  }[tone];

  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
        <Icon className="size-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs text-muted-foreground">{label}</p>
        {loading ? (
          <Skeleton className="h-6 w-16" />
        ) : (
          <p
            className={cn(
              "text-xl font-semibold tabular-nums tracking-tight",
              valueClass,
            )}
          >
            {value}
          </p>
        )}
        {sub && !loading && (
          <p className="text-[10px] text-muted-foreground">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ─── table helpers ────────────────────────────────────────────────────────────

const thCls =
  "px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground";
const tdCls = "px-3 py-2.5 align-middle";

function NumCell({
  value,
  tone,
}: {
  value: string;
  tone?: "blue" | "amber" | "destructive" | "muted";
}) {
  return (
    <td
      className={cn(
        tdCls,
        "text-right font-mono text-[11px] tabular-nums",
        tone === "blue" && "text-blue-600 dark:text-blue-400",
        tone === "amber" && "text-amber-600 dark:text-amber-400",
        tone === "destructive" && "font-medium text-destructive",
        tone === "muted" && "text-muted-foreground",
        !tone && "text-foreground",
      )}
    >
      {value}
    </td>
  );
}

// ─── per-instance section ─────────────────────────────────────────────────────

type RedisInstance = Awaited<ReturnType<typeof rpcClient.redis.list>>[number];

function instanceAgg(
  queues: EnvironmentQueueRow[],
  liveMetrics: Record<string, QueueMetrics>,
) {
  let active = 0,
    waiting = 0,
    delayed = 0,
    failed = 0,
    throughput = 0,
    completedInWindow = 0,
    processedInWindow = 0;

  for (const q of queues) {
    active += q.counts.active;
    waiting += q.counts.waiting;
    delayed += q.counts.delayed;
    failed += q.counts.failed;
    const m = liveMetrics[`${q.redisInstanceId}:${q.name}`];
    if (m) {
      throughput += m.throughputPerMinute;
      completedInWindow += m.completedInWindow;
      processedInWindow += m.totalInWindow;
    }
  }

  const failureRate =
    processedInWindow > 0
      ? (processedInWindow - completedInWindow) / processedInWindow
      : null;

  return {
    active,
    backlog: waiting + delayed,
    failed,
    throughput,
    failureRate,
  };
}

function InstanceSection({
  redis,
  queues,
  liveMetrics,
  workspaceId,
  environmentId,
}: {
  redis: RedisInstance;
  queues: EnvironmentQueueRow[];
  liveMetrics: Record<string, QueueMetrics>;
  workspaceId: string;
  environmentId: string;
}) {
  const [expanded, setExpanded] = useState(true);

  const agg = useMemo(
    () => instanceAgg(queues, liveMetrics),
    [queues, liveMetrics],
  );

  const metricsReady = queues.some(
    (q) => liveMetrics[`${q.redisInstanceId}:${q.name}`] !== undefined,
  );

  const isConnected = redis.status === "connected";

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center gap-3 border-b border-border bg-muted/40 px-4 py-3 text-left transition-colors hover:bg-muted/60"
      >
        <span
          className={cn(
            "size-2 shrink-0 rounded-full",
            isConnected ? "bg-emerald-500" : "bg-muted-foreground/40",
          )}
        />
        <RedisIcon className="size-3.5 shrink-0 text-red-500" />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-medium">
            {redis.nickname || "Unnamed instance"}
          </span>
          <span className="shrink-0 rounded border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
            {queues.length} queue{queues.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-4 font-mono text-[11px] tabular-nums">
          {agg.active > 0 && (
            <span className="text-blue-600 dark:text-blue-400">
              {fmt(agg.active)} active
            </span>
          )}
          {agg.backlog > 0 && (
            <span className="text-amber-600 dark:text-amber-400">
              {fmt(agg.backlog)} backlog
            </span>
          )}
          {agg.failed > 0 && (
            <span className="text-destructive">{fmt(agg.failed)} failed</span>
          )}
          <span className="text-muted-foreground">
            {metricsReady ? fmtThroughput(agg.throughput) : "—"}
          </span>
        </div>

        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && queues.length === 0 && (
        <div className="flex h-16 items-center justify-center text-xs text-muted-foreground">
          No queues discovered yet.
        </div>
      )}

      {expanded && queues.length > 0 && (
        <table className="w-full text-xs">
          <thead className="bg-muted/20">
            <tr className="border-b border-border text-left">
              <th className={cn(thCls, "pl-4")}>Queue</th>
              <th className={cn(thCls, "text-right")}>Waiting</th>
              <th className={cn(thCls, "text-right")}>Active</th>
              <th className={cn(thCls, "text-right")}>Delayed</th>
              <th className={cn(thCls, "text-right")}>Failed</th>
              <th className={cn(thCls, "text-right")}>Throughput</th>
              <th className={cn(thCls, "text-right")}>Fail rate</th>
              <th className={cn(thCls, "text-right")}>P95</th>
              <th className={cn(thCls, "pr-4")}>Status</th>
            </tr>
          </thead>
          <tbody>
            {queues.map((queue) => {
              const key = `${queue.redisInstanceId}:${queue.name}`;
              const m = liveMetrics[key];
              return (
                <tr
                  key={key}
                  className="border-b border-border/60 text-xs last:border-0 hover:bg-muted/20"
                >
                  <td className={cn(tdCls, "pl-4")}>
                    <Link
                      to="/$workspaceId/$environmentId/queues/$queueName"
                      params={{ workspaceId, environmentId, queueName: queue.name }}
                      search={{ redisInstanceId: queue.redisInstanceId }}
                      className="block max-w-[14rem] truncate font-mono font-medium hover:underline"
                    >
                      {queue.name}
                    </Link>
                  </td>
                  <NumCell
                    value={fmt(queue.counts.waiting)}
                    tone={queue.counts.waiting > 0 ? undefined : "muted"}
                  />
                  <NumCell
                    value={fmt(queue.counts.active)}
                    tone={queue.counts.active > 0 ? "blue" : "muted"}
                  />
                  <NumCell
                    value={fmt(queue.counts.delayed)}
                    tone={queue.counts.delayed > 0 ? "amber" : "muted"}
                  />
                  <NumCell
                    value={fmt(queue.counts.failed)}
                    tone={queue.counts.failed > 0 ? "destructive" : "muted"}
                  />
                  <td
                    className={cn(
                      tdCls,
                      "text-right font-mono text-[11px] tabular-nums text-muted-foreground",
                    )}
                  >
                    {m ? fmtThroughput(m.throughputPerMinute) : "—"}
                  </td>
                  <td
                    className={cn(
                      tdCls,
                      "text-right font-mono text-[11px] tabular-nums",
                      m && m.failureRate >= 0.05
                        ? "text-destructive"
                        : m && m.failureRate > 0
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-muted-foreground",
                    )}
                  >
                    {m ? fmtRate(m.failureRate) : "—"}
                  </td>
                  <td
                    className={cn(
                      tdCls,
                      "text-right font-mono text-[11px] tabular-nums text-muted-foreground",
                    )}
                  >
                    {m ? fmtMs(m.p95RuntimeMs) : "—"}
                  </td>
                  <td className={cn(tdCls, "pr-4")}>
                    <QueueStatusChip
                      status={
                        (queue.isPaused ? "paused" : "running") as QueueStatus
                      }
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

function StatsPage() {
  const { workspaceId, environmentId } = Route.useParams();

  const redisQuery = useQuery(environmentRedisQueryOptions(environmentId));
  const queuesQuery = useQuery(environmentQueuesQueryOptions(environmentId));

  const queues = useMemo(() => queuesQuery.data ?? [], [queuesQuery.data]);
  const redisInstances = useMemo(
    () => redisQuery.data ?? [],
    [redisQuery.data],
  );
  const redisInstanceIds = useMemo(
    () => redisInstances.map((i) => i.id),
    [redisInstances],
  );

  useEnvironmentQueueSync(environmentId, queues, redisInstanceIds);
  const liveMetrics = useQueueMetricsLive(queues);

  const queuesByInstance = useMemo(() => {
    const map = new Map<string, EnvironmentQueueRow[]>();
    for (const q of queues) {
      const arr = map.get(q.redisInstanceId) ?? [];
      arr.push(q);
      map.set(q.redisInstanceId, arr);
    }
    return map;
  }, [queues]);

  const summary = useMemo(() => {
    let totalActive = 0,
      totalWaiting = 0,
      totalDelayed = 0,
      totalFailed = 0,
      totalThroughput = 0,
      totalCompleted = 0,
      totalProcessed = 0;

    for (const q of queues) {
      totalActive += q.counts.active;
      totalWaiting += q.counts.waiting;
      totalDelayed += q.counts.delayed;
      totalFailed += q.counts.failed;
      const m = liveMetrics[`${q.redisInstanceId}:${q.name}`];
      if (m) {
        totalThroughput += m.throughputPerMinute;
        totalCompleted += m.completedInWindow;
        totalProcessed += m.totalInWindow;
      }
    }

    const failureRate =
      totalProcessed > 0
        ? (totalProcessed - totalCompleted) / totalProcessed
        : null;

    return {
      totalActive,
      backlog: totalWaiting + totalDelayed,
      totalFailed,
      totalThroughput,
      failureRate,
    };
  }, [queues, liveMetrics]);

  const isLoading = redisQuery.isLoading || queuesQuery.isLoading;
  const metricsReady = Object.keys(liveMetrics).length > 0;

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-4 py-3">
          <Skeleton className="h-5 w-28" />
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <BarChart2Icon className="size-4 text-muted-foreground" />
        <h1 className="text-sm font-semibold">Stats</h1>
        {redisInstances.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">
            {redisInstances.length} instance
            {redisInstances.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {queues.length > 0 && (
            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              <SummaryCard
                label="Active"
                value={fmt(summary.totalActive)}
                sub="currently processing"
                icon={ActivityIcon}
                tone={summary.totalActive > 0 ? "blue" : "default"}
                loading={isLoading}
              />
              <SummaryCard
                label="Backlog"
                value={fmt(summary.backlog)}
                sub="waiting + delayed"
                icon={ClockIcon}
                tone={summary.backlog > 100 ? "amber" : "default"}
                loading={isLoading}
              />
              <SummaryCard
                label="Throughput"
                value={metricsReady ? fmtThroughput(summary.totalThroughput) : "—"}
                sub="across all queues · 5m"
                icon={ZapIcon}
                loading={isLoading}
              />
              <SummaryCard
                label="Failure rate"
                value={
                  metricsReady && summary.failureRate != null
                    ? fmtRate(summary.failureRate)
                    : "—"
                }
                sub="5m window"
                icon={TrendingDownIcon}
                tone={
                  summary.failureRate == null
                    ? "default"
                    : summary.failureRate >= 0.05
                      ? "destructive"
                      : summary.failureRate > 0
                        ? "amber"
                        : "emerald"
                }
                loading={isLoading}
              />
            </div>
          )}

          {redisInstances.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-border py-16 text-center">
              <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                <InboxIcon className="size-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No Redis instances</p>
              <p className="max-w-xs text-xs text-muted-foreground">
                Connect a Redis instance in Settings to start monitoring queues.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {redisInstances.map((redis) => (
                <InstanceSection
                  key={redis.id}
                  redis={redis}
                  queues={queuesByInstance.get(redis.id) ?? []}
                  liveMetrics={liveMetrics}
                  workspaceId={workspaceId}
                  environmentId={environmentId}
                />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
