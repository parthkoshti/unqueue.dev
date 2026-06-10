import { rpcClient } from "@/lib/api";

type QueueMeta = Awaited<ReturnType<typeof rpcClient.queue.getMeta>>;
type QueueCounts = QueueMeta["counts"];
type QueueMetrics = Awaited<ReturnType<typeof rpcClient.queue.getMetrics>>;
type MetricsWindow = "1m" | "1h" | "24h" | "7d";
import {
  CalendarIcon,
  CheckCircle2Icon,
  CirclePlusIcon,
  ClockIcon,
  GitBranchIcon,
  MoreHorizontalIcon,
  PauseCircleIcon,
  RefreshCwIcon,
  TimerIcon,
  XCircleIcon,
  ZapIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type QueueJobFilterState =
  | "completed"
  | "failed"
  | "active"
  | "prioritized"
  | "waiting"
  | "waiting-children"
  | "delayed"
  | "paused"
  | "schedulers";

export const QUEUE_STATE_TABS: Array<{
  state: QueueJobFilterState;
  label: string;
  icon: typeof CheckCircle2Icon;
}> = [
  { state: "completed", label: "Completed", icon: CheckCircle2Icon },
  { state: "failed", label: "Failed", icon: XCircleIcon },
  { state: "active", label: "Active", icon: ZapIcon },
  { state: "prioritized", label: "Prioritized", icon: CirclePlusIcon },
  { state: "waiting", label: "Waiting", icon: ClockIcon },
  {
    state: "waiting-children",
    label: "Waiting Children",
    icon: GitBranchIcon,
  },
  { state: "delayed", label: "Delayed", icon: TimerIcon },
  { state: "paused", label: "Paused", icon: PauseCircleIcon },
  { state: "schedulers", label: "Schedulers", icon: CalendarIcon },
];

export const METRICS_WINDOWS: Array<{ key: MetricsWindow; label: string }> = [
  { key: "1m", label: "Last minute" },
  { key: "1h", label: "Last hour" },
  { key: "24h", label: "Last 24 hours" },
  { key: "7d", label: "Last 7 days" },
];

function getStateCount(counts: QueueCounts | undefined, state: QueueJobFilterState) {
  if (!counts) return 0;
  return counts[state] ?? 0;
}

function formatRate(rate: number) {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatThroughput(value: number) {
  return `${value.toFixed(1)}/min`;
}

export function QueuePageHeader({
  queueName,
  isPaused,
  isFetching,
  canWrite,
  onRefresh,
  onPause,
  onResume,
}: {
  queueName: string;
  isPaused: boolean;
  isFetching: boolean;
  canWrite: boolean;
  onRefresh: () => void;
  onPause: () => void;
  onResume: () => void;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-4 border-b px-4 py-3">
      <h1 className="truncate text-base font-medium">{queueName}</h1>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="icon-sm" variant="ghost" aria-label="Queue actions">
            <MoreHorizontalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onRefresh} disabled={isFetching}>
            <RefreshCwIcon className={isFetching ? "animate-spin" : undefined} />
            Refresh
          </DropdownMenuItem>
          {canWrite && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onPause} disabled={isPaused}>
                <PauseCircleIcon />
                Pause queue
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onResume} disabled={!isPaused}>
                Resume queue
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function QueueMetricsPanel({
  window,
  metrics,
  isLoading,
  onWindowChange,
}: {
  window: MetricsWindow;
  metrics: QueueMetrics | undefined;
  isLoading: boolean;
  onWindowChange: (window: MetricsWindow) => void;
}) {
  const successRate = metrics?.successRate ?? 1;
  const failureRate = metrics?.failureRate ?? 0;
  const completedInWindow = metrics?.completedInWindow ?? 0;
  const failedInWindow = metrics?.failedInWindow ?? 0;
  const totalInWindow = metrics?.totalInWindow ?? 0;
  const throughput = metrics?.throughputPerMinute ?? 0;

  return (
    <div className="shrink-0 space-y-4 border-b px-4 py-4">
      <div className="flex flex-wrap gap-1.5">
        {METRICS_WINDOWS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onWindowChange(item.key)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              window === item.key
                ? "border-border bg-muted text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <MetricCard
          label="Success Rate"
          value={isLoading ? undefined : formatRate(successRate)}
          sub={
            isLoading
              ? undefined
              : `${completedInWindow.toLocaleString()}/${totalInWindow.toLocaleString()}`
          }
          isLoading={isLoading}
        />
        <MetricCard
          label="Throughput"
          value={isLoading ? undefined : formatThroughput(throughput)}
          sub={
            isLoading
              ? undefined
              : `${completedInWindow.toLocaleString()} job${completedInWindow === 1 ? "" : "s"}`
          }
          isLoading={isLoading}
        />
        <MetricCard
          label="Completed"
          value={
            isLoading ? undefined : completedInWindow.toLocaleString()
          }
          sub={isLoading ? undefined : "in period"}
          isLoading={isLoading}
        />
        <MetricCard
          label="Failed"
          value={isLoading ? undefined : failedInWindow.toLocaleString()}
          sub={isLoading ? undefined : `${formatRate(failureRate)} rate`}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  isLoading,
}: {
  label: string;
  value?: string;
  sub?: string;
  isLoading: boolean;
}) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      {isLoading ? (
        <Skeleton className="h-7 w-20" />
      ) : (
        <p className="text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
      )}
      {isLoading ? (
        <Skeleton className="h-3 w-16" />
      ) : (
        <p className="text-[10px] text-muted-foreground tabular-nums">{sub}</p>
      )}
    </div>
  );
}

export function QueueStateTabs({
  state,
  counts,
  isLoading,
  onStateChange,
}: {
  state: QueueJobFilterState;
  counts: QueueCounts | undefined;
  isLoading: boolean;
  onStateChange: (state: QueueJobFilterState) => void;
}) {
  return (
    <div className="shrink-0">
      <Tabs
        value={state}
        onValueChange={(next) => onStateChange(next as QueueJobFilterState)}
        className="gap-0"
      >
        <TabsList
          variant="line"
          className="grid h-auto! w-full grid-cols-3 items-stretch gap-0 overflow-visible rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto! sm:grid-cols-5 xl:grid-cols-9"
        >
          {QUEUE_STATE_TABS.map((tab) => {
            const Icon = tab.icon;
            const count = getStateCount(counts, tab.state);

            return (
              <TabsTrigger
                key={tab.state}
                value={tab.state}
                disabled={isLoading}
                className={cn(
                  "flex h-auto! min-h-14 w-full min-w-0 flex-col items-start justify-center gap-1.5 rounded-none border-0 border-border/60 px-3 py-3 text-left",
                  "border-r whitespace-normal max-sm:nth-[3n]:border-r-0",
                  "sm:max-xl:nth-[5n]:border-r-0",
                  "xl:nth-[9n]:border-r-0",
                  "after:hidden",
                  "text-muted-foreground hover:bg-muted/30 hover:text-foreground",
                  "data-active:bg-muted/40 data-active:text-foreground",
                  tab.state === "failed" &&
                    !isLoading &&
                    count > 0 &&
                    "data-active:text-destructive",
                )}
              >
                <span className="flex w-full min-w-0 items-center justify-between gap-2">
                  <span className="truncate text-[11px] font-medium leading-none">
                    {tab.label}
                  </span>
                  <Icon className="size-3.5 shrink-0 opacity-50" />
                </span>
                {isLoading ? (
                  <Skeleton className="h-4 w-14 rounded-sm" />
                ) : (
                  <span
                    className={cn(
                      "text-sm font-semibold leading-none tabular-nums",
                      tab.state === "failed" && count > 0 && "text-destructive",
                    )}
                  >
                    {count.toLocaleString()}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}
