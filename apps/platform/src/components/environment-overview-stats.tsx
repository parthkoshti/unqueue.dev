import { Link } from "@tanstack/react-router";
import {
  ActivityIcon,
  AlertTriangleIcon,
  ClockIcon,
  DatabaseIcon,
  LayersIcon,
  PauseIcon,
  PercentIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  JOB_STATE_META,
  queueFailureRate,
  type EnvironmentQueueStats,
  type AttentionQueue,
} from "@/lib/aggregate-queue-stats";
import { JobStatusChip } from "@/components/job-status-chip";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@unstall/ui/components/card";
import { Skeleton } from "@/components/ui/skeleton";

function formatCount(value: number) {
  return value.toLocaleString();
}

function formatRate(rate: number | null) {
  if (rate == null) return "—";
  return `${Math.round(rate * 100)}%`;
}

function formatFailureRate(rate: number | null) {
  if (rate == null) return "—";
  return `${Number((rate * 100).toPrecision(3))}%`;
}

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  isLoading,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  isLoading?: boolean;
  tone?: "default" | "destructive" | "success" | "warning";
}) {
  const toneClass =
    tone === "destructive"
      ? "text-destructive"
      : tone === "success"
        ? "text-emerald-600 dark:text-emerald-400"
        : tone === "warning"
          ? "text-amber-600 dark:text-amber-400"
          : undefined;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-muted-foreground">{label}</p>
            {isLoading ? (
              <Skeleton className="h-7 w-20" />
            ) : (
              <p
                className={cn(
                  "truncate text-2xl font-semibold tabular-nums tracking-tight",
                  toneClass,
                )}
              >
                {value}
              </p>
            )}
            {hint && !isLoading && (
              <p className="text-[10px] text-muted-foreground">{hint}</p>
            )}
          </div>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted/60">
            <Icon className="size-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EnvironmentOverviewStatsGrid({
  stats,
  connectedRedis,
  totalRedis,
  isLoading,
}: {
  stats: EnvironmentQueueStats;
  connectedRedis: number;
  totalRedis: number;
  isLoading?: boolean;
}) {
  const failedTone = stats.totals.failed > 0 ? "destructive" : "default";
  const successTone =
    stats.successRate == null
      ? "default"
      : stats.successRate >= 0.95
        ? "success"
        : stats.successRate >= 0.8
          ? "warning"
          : "destructive";
  const redisTone =
    totalRedis === 0
      ? "default"
      : connectedRedis === totalRedis
        ? "success"
        : connectedRedis === 0
          ? "destructive"
          : "warning";

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        label="Active jobs"
        value={formatCount(stats.totals.active)}
        hint="Currently processing"
        icon={ActivityIcon}
        isLoading={isLoading}
        tone={stats.totals.active > 0 ? "default" : "default"}
      />
      <StatCard
        label="Backlog"
        value={formatCount(stats.backlog)}
        hint={`${formatCount(stats.totals.waiting)} waiting · ${formatCount(stats.totals.delayed)} delayed`}
        icon={ClockIcon}
        isLoading={isLoading}
        tone={stats.backlog > 100 ? "warning" : "default"}
      />
      <StatCard
        label="Failed jobs"
        value={formatCount(stats.totals.failed)}
        hint={
          stats.queuesWithFailures > 0
            ? `Across ${stats.queuesWithFailures} ${stats.queuesWithFailures === 1 ? "queue" : "queues"}`
            : "No failures detected"
        }
        icon={AlertTriangleIcon}
        isLoading={isLoading}
        tone={failedTone}
      />
      <StatCard
        label="Success rate"
        value={formatRate(stats.successRate)}
        hint={
          stats.finishedJobs > 0
            ? `From ${formatCount(stats.finishedJobs)} finished jobs`
            : "No completed or failed jobs yet"
        }
        icon={PercentIcon}
        isLoading={isLoading}
        tone={successTone}
      />
      <StatCard
        label="Queues"
        value={formatCount(stats.queueCount)}
        hint={`${formatCount(stats.runningQueues)} running · ${formatCount(stats.pausedQueues)} paused`}
        icon={LayersIcon}
        isLoading={isLoading}
        tone={stats.pausedQueues > 0 ? "warning" : "default"}
      />
      <StatCard
        label="Redis"
        value={totalRedis === 0 ? "—" : `${connectedRedis}/${totalRedis}`}
        hint={
          totalRedis === 0
            ? "No instances configured"
            : connectedRedis === totalRedis
              ? "All instances connected"
              : `${totalRedis - connectedRedis} offline`
        }
        icon={DatabaseIcon}
        isLoading={isLoading}
        tone={redisTone}
      />
      <StatCard
        label="Total jobs"
        value={formatCount(stats.totalJobs)}
        hint={`${formatCount(stats.totals.completed)} completed`}
        icon={LayersIcon}
        isLoading={isLoading}
      />
      <StatCard
        label="Paused queues"
        value={formatCount(stats.pausedQueues)}
        hint={
          stats.pausedQueues > 0
            ? "Processing halted on these queues"
            : "All queues running"
        }
        icon={PauseIcon}
        isLoading={isLoading}
        tone={stats.pausedQueues > 0 ? "warning" : "default"}
      />
    </div>
  );
}

export function EnvironmentJobStateBreakdown({
  stats,
  isLoading,
}: {
  stats: EnvironmentQueueStats;
  isLoading?: boolean;
}) {
  const segments = JOB_STATE_META.map((state) => ({
    ...state,
    count: stats.totals[state.key],
  })).filter((segment) => segment.count > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Job distribution</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-2.5 w-full rounded-full" />
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-3 w-20" />
              ))}
            </div>
          </>
        ) : stats.totalJobs === 0 ? (
          <p className="text-xs text-muted-foreground">No jobs across queues</p>
        ) : (
          <>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted">
              {segments.map((segment) => (
                <div
                  key={segment.key}
                  className={cn("min-w-px", segment.barClass)}
                  style={{
                    width: `${(segment.count / stats.totalJobs) * 100}%`,
                  }}
                  title={`${segment.label}: ${formatCount(segment.count)}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {JOB_STATE_META.map((state) => (
                <div
                  key={state.key}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  <span
                    className={cn("size-2 rounded-full", state.barClass)}
                  />
                  <span>{state.label}</span>
                  <span className="font-mono tabular-nums text-foreground">
                    {formatCount(stats.totals[state.key])}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const thClass =
  "px-3 py-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground";
const tdClass = "px-3 py-2 align-middle text-[11px]";

export function EnvironmentAttentionQueues({
  queues,
  workspaceId,
  environmentId,
}: {
  queues: AttentionQueue[];
  workspaceId: string;
  environmentId: string;
}) {
  if (queues.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Needs attention</CardTitle>
        <p className="text-xs text-muted-foreground">
          Paused queues, failures, or backlog of 10+ jobs
        </p>
      </CardHeader>
      <CardContent className="p-0 pb-1">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border text-left">
              <th className={cn(thClass, "pl-4")}>Queue</th>
              <th className={cn(thClass, "text-right")}>Backlog</th>
              <th className={cn(thClass, "text-right")}>Failed</th>
              <th className={cn(thClass, "text-right")}>% Failed</th>
              <th className={cn(thClass, "text-right")}>Active</th>
              <th className={cn(thClass, "pr-4")}>Status</th>
            </tr>
          </thead>
          <tbody>
            {queues.map((queue) => {
              const failureRate = queueFailureRate(queue);

              return (
              <tr
                key={`${queue.redisInstanceId}-${queue.name}`}
                className="border-b border-border/60 last:border-0"
              >
                <td className={cn(tdClass, "pl-4")}>
                  <Link
                    to="/$workspaceId/$environmentId/queues/$queueName"
                    params={{
                      workspaceId,
                      environmentId,
                      queueName: queue.name,
                    }}
                    search={{ redisInstanceId: queue.redisInstanceId }}
                    className="block max-w-[14rem] truncate font-mono font-medium hover:underline"
                  >
                    {queue.name}
                  </Link>
                </td>
                <td
                  className={cn(
                    tdClass,
                    "text-right font-mono tabular-nums",
                    queue.backlog >= 10 && "font-medium text-amber-600 dark:text-amber-400",
                  )}
                >
                  {formatCount(queue.backlog)}
                </td>
                <td
                  className={cn(
                    tdClass,
                    "text-right font-mono tabular-nums",
                    queue.counts.failed > 0 && "font-medium text-destructive",
                  )}
                >
                  {formatCount(queue.counts.failed)}
                </td>
                <td
                  className={cn(
                    tdClass,
                    "text-right font-mono tabular-nums",
                    failureRate != null &&
                      failureRate >= 0.2 &&
                      "font-medium text-destructive",
                    failureRate != null &&
                      failureRate >= 0.05 &&
                      failureRate < 0.2 &&
                      "font-medium text-amber-600 dark:text-amber-400",
                  )}
                >
                  {formatFailureRate(failureRate)}
                </td>
                <td className={cn(tdClass, "text-right font-mono tabular-nums")}>
                  {formatCount(queue.counts.active)}
                </td>
                <td className={cn(tdClass, "pr-4")}>
                  {queue.isPaused ? (
                    <JobStatusChip state="paused" />
                  ) : queue.counts.failed > 0 ? (
                    <JobStatusChip state="failed" label="failures" />
                  ) : (
                    <JobStatusChip state="delayed" label="backlog" />
                  )}
                </td>
              </tr>
            );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
