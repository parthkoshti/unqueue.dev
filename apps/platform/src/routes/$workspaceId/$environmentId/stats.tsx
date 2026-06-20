import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { BarChart2Icon } from "lucide-react";
import { rpcClient } from "@/lib/api";
import {
  environmentQueuesQueryOptions,
  environmentRedisQueryOptions,
} from "@/lib/environment-queues-query";
import { useEnvironmentQueueSync } from "@/hooks/use-environment-queue-sync";
import type { EnvironmentQueueRow } from "@/components/environment-queues-table";
import { QueueStatusChip, type QueueStatus } from "@/components/queue-status-chip";
import { ScrollArea } from "@unqueue/ui/components/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RoutePending } from "@/lib/route-pending";

export const Route = createFileRoute("/$workspaceId/$environmentId/stats")({
  pendingComponent: RoutePending,
  component: StatsPage,
});


function fmt(n: number) {
  return n.toLocaleString();
}

function fmtRate(r: number) {
  return `${(r * 100).toFixed(1)}%`;
}

function fmtMs(ms: number) {
  if (ms === 0) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtThroughput(n: number) {
  if (n < 0.1) return "< 0.1/min";
  return `${n.toFixed(1)}/min`;
}

// Minimal SVG sparkline
function Sparkline({
  data,
  color = "hsl(var(--primary))",
  height = 40,
  width = 160,
}: {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}) {
  if (data.length < 2) {
    return (
      <svg width={width} height={height}>
        <line
          x1={0}
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="hsl(var(--muted-foreground))"
          strokeWidth={1}
          strokeDasharray="4 4"
        />
      </svg>
    );
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - pad - ((v - min) / range) * (height - pad * 2);
    return `${x},${y}`;
  });

  const areaPoints = [
    `0,${height}`,
    ...points,
    `${width},${height}`,
  ].join(" ");

  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polygon
        points={areaPoints}
        fill={color}
        fillOpacity={0.1}
        stroke="none"
      />
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HistoryChart<T>({
  data,
  label,
  getValue,
  color,
}: {
  data: T[];
  label: string;
  getValue: (row: T) => number;
  color?: string;
}) {
  const values = data.map(getValue);
  const latest = values.at(-1) ?? 0;
  const peak = Math.max(...values);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-start justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <Sparkline data={values} color={color} width={200} height={48} />
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-lg font-semibold tabular-nums">
          {typeof latest === "number" && latest < 1
            ? fmtRate(latest)
            : latest.toFixed(1)}
        </span>
        <span className="text-[10px] text-muted-foreground">
          peak {typeof peak === "number" && peak < 1 ? fmtRate(peak) : peak.toFixed(1)}
        </span>
      </div>
    </div>
  );
}

function QueueHistoryPanel({
  queue,
}: {
  queue: EnvironmentQueueRow & { redisInstanceId: string };
}) {
  const historyQuery = useQuery({
    queryKey: ["queue-history", queue.redisInstanceId, queue.name],
    queryFn: () =>
      rpcClient.stats.getQueueHistory({
        redisInstanceId: queue.redisInstanceId,
        queueName: queue.name,
        hours: 24,
      }),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const data = historyQuery.data ?? [];

  if (historyQuery.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex h-28 items-center justify-center text-xs text-muted-foreground">
        No historical data yet — snapshots are collected every minute.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-4">
      <HistoryChart
        data={data}
        label="Throughput (jobs/min)"
        getValue={(r) => r.throughputPerMinute}
        color="hsl(var(--primary))"
      />
      <HistoryChart
        data={data}
        label="Failure rate"
        getValue={(r) => r.failureRate}
        color="hsl(var(--destructive))"
      />
      <HistoryChart
        data={data}
        label="Waiting"
        getValue={(r) => r.waiting}
        color="hsl(220 60% 55%)"
      />
      <HistoryChart
        data={data}
        label="P95 runtime"
        getValue={(r) => r.p95RuntimeMs}
        color="hsl(38 80% 50%)"
      />
    </div>
  );
}

const thClass =
  "px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground";
const tdClass = "px-3 py-2 align-middle";

function StatsPage() {
  const { workspaceId, environmentId } = Route.useParams();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const redisQuery = useQuery(environmentRedisQueryOptions(environmentId));
  const queuesQuery = useQuery(environmentQueuesQueryOptions(environmentId));

  const queues = queuesQuery.data ?? [];
  const redisInstances = redisQuery.data ?? [];
  const redisInstanceIds = redisInstances.map((i) => i.id);

  useEnvironmentQueueSync(environmentId, queues, redisInstanceIds);

  const getMetricsQuery = useCallback(
    (queue: EnvironmentQueueRow) =>
      rpcClient.queue.getMetrics({
        redisInstanceId: queue.redisInstanceId,
        queueName: queue.name,
        window: "5m",
      }),
    [],
  );

  const [liveMetrics, setLiveMetrics] = useState<
    Record<string, Awaited<ReturnType<typeof rpcClient.queue.getMetrics>>>
  >({});

  useEffect(() => {
    if (queues.length === 0) return;
    let cancelled = false;

    void Promise.all(
      queues.map(async (q) => {
        try {
          const key = `${q.redisInstanceId}:${q.name}`;
          const m = await getMetricsQuery(q);
          if (!cancelled) {
            setLiveMetrics((prev) => ({ ...prev, [key]: m }));
          }
        } catch {}
      }),
    );

    return () => {
      cancelled = true;
    };
  }, [queues, getMetricsQuery]);

  const selectedQueue = queues.find(
    (q) => `${q.redisInstanceId}:${q.name}` === selectedKey,
  );

  const isLoading = redisQuery.isLoading || queuesQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="border-b border-border px-6 py-4">
          <Skeleton className="h-6 w-32" />
        </div>
        <div className="flex-1 p-6">
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-border px-6 py-4">
        <BarChart2Icon className="size-4 text-muted-foreground" />
        <h1 className="text-sm font-semibold">Queue Stats</h1>
        <span className="ml-auto text-xs text-muted-foreground">
          {queues.length} queue{queues.length !== 1 ? "s" : ""}
        </span>
      </div>

      {queues.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          No queues discovered yet.
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-muted/40 backdrop-blur-sm">
              <tr className="border-b border-border text-left">
                <th className={cn(thClass, "pl-6")}>Queue</th>
                <th className={cn(thClass, "text-right")}>Waiting</th>
                <th className={cn(thClass, "text-right")}>Active</th>
                <th className={cn(thClass, "text-right")}>Delayed</th>
                <th className={cn(thClass, "text-right")}>Failed</th>
                <th className={cn(thClass, "text-right")}>Throughput</th>
                <th className={cn(thClass, "text-right")}>Failure Rate</th>
                <th className={cn(thClass, "text-right")}>P95</th>
                <th className={cn(thClass, "pr-6")}>Status</th>
              </tr>
            </thead>
            <tbody>
              {queues.map((queue) => {
                const key = `${queue.redisInstanceId}:${queue.name}`;
                const m = liveMetrics[key];
                const isSelected = selectedKey === key;

                return (
                  <>
                    <tr
                      key={key}
                      className={cn(
                        "group cursor-pointer border-b border-border/60 transition-colors last:border-0",
                        isSelected
                          ? "bg-muted/60"
                          : "hover:bg-muted/40",
                      )}
                      onClick={() =>
                        setSelectedKey(isSelected ? null : key)
                      }
                    >
                      <td className={cn(tdClass, "pl-6")}>
                        <span className="font-medium">{queue.name}</span>
                      </td>
                      <td
                        className={cn(
                          tdClass,
                          "text-right font-mono tabular-nums",
                          queue.counts.waiting > 0
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {fmt(queue.counts.waiting)}
                      </td>
                      <td
                        className={cn(
                          tdClass,
                          "text-right font-mono tabular-nums",
                          queue.counts.active > 0
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {fmt(queue.counts.active)}
                      </td>
                      <td
                        className={cn(
                          tdClass,
                          "text-right font-mono tabular-nums",
                          queue.counts.delayed > 0
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {fmt(queue.counts.delayed)}
                      </td>
                      <td
                        className={cn(
                          tdClass,
                          "text-right font-mono tabular-nums",
                          queue.counts.failed > 0
                            ? "text-destructive font-medium"
                            : "text-muted-foreground",
                        )}
                      >
                        {fmt(queue.counts.failed)}
                      </td>
                      <td
                        className={cn(
                          tdClass,
                          "text-right font-mono tabular-nums text-muted-foreground",
                        )}
                      >
                        {m ? fmtThroughput(m.throughputPerMinute) : "—"}
                      </td>
                      <td
                        className={cn(
                          tdClass,
                          "text-right font-mono tabular-nums",
                          m && m.failureRate > 0.05
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
                          tdClass,
                          "text-right font-mono tabular-nums text-muted-foreground",
                        )}
                      >
                        {m ? fmtMs(m.p95RuntimeMs) : "—"}
                      </td>
                      <td className={cn(tdClass, "pr-6")}>
                        <QueueStatusChip
                          status={(queue.isPaused ? "paused" : "running") as QueueStatus}
                        />
                      </td>
                    </tr>
                    {isSelected && (
                      <tr key={`${key}-detail`} className="border-b border-border/60 bg-muted/20">
                        <td colSpan={9} className="p-0">
                          <div className="px-2 py-1">
                            <p className="mb-2 px-2 pt-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              Last 24 hours — {queue.name}
                            </p>
                            <QueueHistoryPanel queue={queue} />
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      )}
    </div>
  );
}
