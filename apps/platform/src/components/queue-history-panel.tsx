import { useQuery } from "@tanstack/react-query";
import { ClockIcon } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { rpcClient } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type MetricsWindow = "1m" | "1h" | "24h" | "7d";

const WINDOW_HOURS: Record<MetricsWindow, number> = {
  "1m": 1 / 60,
  "1h": 1,
  "24h": 24,
  "7d": 168,
};

type SnapshotRow = Awaited<ReturnType<typeof rpcClient.stats.getQueueHistory>>[number];

// ─── formatters ───────────────────────────────────────────────────────────────

function fmt(n: number) {
  return Math.round(n).toLocaleString();
}

function fmtRate(r: number) {
  const pct = r * 100;
  if (pct === 0) return "0%";
  if (pct < 0.1) return "<0.1%";
  if (pct < 10) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}

function fmtThroughput(n: number) {
  if (n === 0) return "0/min";
  if (n < 0.1) return "<0.1/min";
  return `${n.toFixed(1)}/min`;
}

function fmtTickTime(t: number, rangeMs: number): string {
  const d = new Date(t);
  if (rangeMs >= 48 * 3_600_000) {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function tickInterval(rangeMs: number): number {
  if (rangeMs < 2 * 3_600_000) return 15 * 60_000;
  if (rangeMs < 12 * 3_600_000) return 3_600_000;
  if (rangeMs < 48 * 3_600_000) return 4 * 3_600_000;
  return 24 * 3_600_000;
}

function xTicks(rows: SnapshotRow[]): number[] {
  if (rows.length < 2) return [];
  const times = rows.map((r) => new Date(r.snapshotAt).getTime());
  const minT = times[0]!;
  const maxT = times[times.length - 1]!;
  const interval = tickInterval(maxT - minT);
  const first = Math.ceil(minT / interval) * interval;
  const ticks: number[] = [];
  for (let t = first; t <= maxT; t += interval) ticks.push(t);
  return ticks;
}

// ─── shared chart config ──────────────────────────────────────────────────────

const CHART_MARGIN = { top: 4, right: 4, left: 4, bottom: 0 };
const Y_AXIS_WIDTH = 44;
const CHART_HEIGHT = 90;
const RATE_DOMAIN_STEPS = [
  0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1,
];
const TICK_STYLE: React.CSSProperties = {
  fontSize: 9,
  fill: "var(--muted-foreground)",
  fontFamily: "var(--font-mono, monospace)",
};

type TickCoord = string | number | undefined;

function tickCoord(value: TickCoord): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function failureRateDomainMax(rows: SnapshotRow[]): number {
  const maxRate = Math.max(0, ...rows.map((r) => r.failureRate));
  if (maxRate === 0) return 0.01;

  const paddedMax = maxRate * 1.15;
  return RATE_DOMAIN_STEPS.find((step) => paddedMax <= step) ?? 1;
}

function XTick({
  x,
  y,
  payload,
  formatter,
}: {
  x?: TickCoord;
  y?: TickCoord;
  payload?: { value: string | number };
  formatter: (v: number) => string;
}) {
  return (
    <text x={tickCoord(x)} y={tickCoord(y) + 4} textAnchor="middle" style={TICK_STYLE}>
      {formatter(Number(payload?.value ?? 0))}
    </text>
  );
}

function YTick({
  x,
  y,
  payload,
  formatter,
}: {
  x?: TickCoord;
  y?: TickCoord;
  payload?: { value: string | number };
  formatter: (v: number) => string;
}) {
  return (
    <text
      x={tickCoord(x) - 2}
      y={tickCoord(y)}
      textAnchor="end"
      dominantBaseline="middle"
      style={TICK_STYLE}
    >
      {formatter(Number(payload?.value ?? 0))}
    </text>
  );
}

type TooltipEntry = { name?: string; value?: unknown; color?: string };

function TooltipBox({
  active,
  payload,
  label,
  formatValue,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: unknown;
  formatValue: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border border-border bg-popover px-2 py-1.5 shadow-md">
      {label != null && (
        <p className="mb-1 text-[10px] text-muted-foreground">
          {new Date(label as number).toLocaleString([], {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
      {payload.map((item, i) => (
        <p
          key={i}
          className="font-mono text-[11px] tabular-nums"
          style={{ color: item.color }}
        >
          {item.name}: {formatValue(Number(item.value))}
        </p>
      ))}
    </div>
  );
}

// ─── chart card ───────────────────────────────────────────────────────────────

function ChartCard({
  label,
  sub,
  children,
  className,
}: {
  label: string;
  sub?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "min-w-0 w-full border-t border-r border-b-0 border-border px-3 py-2.5",
        className,
      )}
    >
      <p className="text-[11px] text-muted-foreground">{label}</p>
      {sub !== undefined && (
        <p className="font-mono text-base font-semibold tracking-tight tabular-nums">
          {sub}
        </p>
      )}
      <div className="mt-2">{children}</div>
    </div>
  );
}

// ─── individual charts ────────────────────────────────────────────────────────

function AddedVsCompletedChart({ rows }: { rows: SnapshotRow[] }) {
  const ticks = xTicks(rows);
  const rangeMs =
    rows.length >= 2
      ? new Date(rows.at(-1)!.snapshotAt).getTime() -
        new Date(rows[0]!.snapshotAt).getTime()
      : 0;

  const data = rows.map((r) => ({
    t: new Date(r.snapshotAt).getTime(),
    added: r.addedInWindow,
    completed: r.completedInWindow,
  }));

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <LineChart data={data} margin={CHART_MARGIN}>
        <CartesianGrid
          strokeDasharray="2 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="t"
          type="number"
          domain={["dataMin", "dataMax"]}
          scale="time"
          ticks={ticks}
          tick={(props) => <XTick {...props} formatter={(t) => fmtTickTime(t, rangeMs)} />}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={(props) => <YTick {...props} formatter={fmt} />}
          domain={[0, (dataMax: number) => Math.max(dataMax, 10)]}
          axisLine={false}
          tickLine={false}
          width={Y_AXIS_WIDTH}
        />
        <Tooltip
          content={({ active, payload, label }) => (
            <TooltipBox active={active} payload={payload as unknown as TooltipEntry[]} label={label} formatValue={fmt} />
          )}
        />
        <Line
          type="monotone"
          dataKey="added"
          name="added"
          stroke="hsl(220 60% 55%)"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 2 }}
        />
        <Line
          type="monotone"
          dataKey="completed"
          name="completed"
          stroke="hsl(var(--primary))"
          strokeWidth={1.5}
          strokeDasharray="4 2"
          dot={false}
          activeDot={{ r: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function QueueDepthChart({ rows }: { rows: SnapshotRow[] }) {
  const ticks = xTicks(rows);
  const rangeMs =
    rows.length >= 2
      ? new Date(rows.at(-1)!.snapshotAt).getTime() -
        new Date(rows[0]!.snapshotAt).getTime()
      : 0;

  const data = rows.map((r) => ({
    t: new Date(r.snapshotAt).getTime(),
    waiting: r.waiting,
  }));

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <AreaChart data={data} margin={CHART_MARGIN}>
        <defs>
          <linearGradient id="depthFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(220 60% 55%)" stopOpacity={0.15} />
            <stop offset="95%" stopColor="hsl(220 60% 55%)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="2 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="t"
          type="number"
          domain={["dataMin", "dataMax"]}
          scale="time"
          ticks={ticks}
          tick={(props) => <XTick {...props} formatter={(t) => fmtTickTime(t, rangeMs)} />}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={(props) => <YTick {...props} formatter={fmt} />}
          domain={[0, (dataMax: number) => Math.max(dataMax, 10)]}
          axisLine={false}
          tickLine={false}
          width={Y_AXIS_WIDTH}
        />
        <Tooltip
          content={({ active, payload, label }) => (
            <TooltipBox active={active} payload={payload as unknown as TooltipEntry[]} label={label} formatValue={fmt} />
          )}
        />
        <Area
          type="monotone"
          dataKey="waiting"
          name="waiting"
          stroke="hsl(220 60% 55%)"
          strokeWidth={1.5}
          fill="url(#depthFill)"
          dot={false}
          activeDot={{ r: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function FailureRateChart({ rows }: { rows: SnapshotRow[] }) {
  const ticks = xTicks(rows);
  const yMax = failureRateDomainMax(rows);
  const rangeMs =
    rows.length >= 2
      ? new Date(rows.at(-1)!.snapshotAt).getTime() -
        new Date(rows[0]!.snapshotAt).getTime()
      : 0;

  const data = rows.map((r) => ({
    t: new Date(r.snapshotAt).getTime(),
    rate: r.failureRate,
  }));

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <AreaChart data={data} margin={CHART_MARGIN}>
        <defs>
          <linearGradient id="failFill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor="var(--color-destructive)"
              stopOpacity={0.15}
            />
            <stop
              offset="95%"
              stopColor="var(--color-destructive)"
              stopOpacity={0}
            />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="2 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="t"
          type="number"
          domain={["dataMin", "dataMax"]}
          scale="time"
          ticks={ticks}
          tick={(props) => <XTick {...props} formatter={(t) => fmtTickTime(t, rangeMs)} />}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={(props) => <YTick {...props} formatter={fmtRate} />}
          domain={[0, yMax]}
          ticks={[0, yMax / 2, yMax]}
          axisLine={false}
          tickLine={false}
          width={Y_AXIS_WIDTH}
        />
        <Tooltip
          content={({ active, payload, label }) => (
            <TooltipBox active={active} payload={payload as unknown as TooltipEntry[]} label={label} formatValue={fmtRate} />
          )}
        />
        <Area
          type="monotone"
          dataKey="rate"
          name="failure rate"
          stroke="var(--color-destructive)"
          strokeWidth={1.5}
          fill="url(#failFill)"
          dot={false}
          activeDot={{ r: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── main panel ───────────────────────────────────────────────────────────────

export function QueueHistoryPanel({
  redisInstanceId,
  queueName,
  window,
}: {
  redisInstanceId: string;
  queueName: string;
  window: MetricsWindow;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["stats-history", redisInstanceId, queueName, window],
    queryFn: () =>
      rpcClient.stats.getQueueHistory({
        redisInstanceId,
        queueName,
        hours: WINDOW_HOURS[window],
      }),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const rows = data ?? [];
  const latest = rows.at(-1);

  if (isLoading) {
    return (
      <div className="grid w-full grid-cols-1 gap-0 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "min-w-0 w-full space-y-1.5 border-t border-r border-b-0 border-border px-3 py-2.5",
              i === 0 && "border-l",
            )}
          >
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="mt-2 h-[90px] w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-14 items-center justify-center gap-2 border-t border-border text-xs text-muted-foreground">
        <ClockIcon className="size-3.5" />
        Snapshots collected every minute — check back shortly.
      </div>
    );
  }

  const addedLatest = latest?.addedInWindow ?? 0;
  const completedLatest = latest?.completedInWindow ?? 0;

  return (
    <div className="grid w-full grid-cols-1 gap-0 sm:grid-cols-3">
      <ChartCard
        label="Jobs Added vs Completed"
        sub={
          addedLatest || completedLatest
            ? `${fmt(addedLatest)} added · ${fmt(completedLatest)} done`
            : undefined
        }
        className="border-l"
      >
        <AddedVsCompletedChart rows={rows} />
      </ChartCard>

      <ChartCard
        label="Queue Depth"
        sub={latest ? fmt(latest.waiting) : undefined}
      >
        <QueueDepthChart rows={rows} />
      </ChartCard>

      <ChartCard
        label="Failure Rate"
        sub={latest ? fmtRate(latest.failureRate) : undefined}
      >
        <FailureRateChart rows={rows} />
      </ChartCard>
    </div>
  );
}
