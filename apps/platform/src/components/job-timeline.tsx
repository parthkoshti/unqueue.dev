import { ChevronRightIcon, Loader2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  formatAbsoluteTimestamp,
  formatElapsedMs,
  formatJobTimestamp,
  formatStartDelayMs,
} from "@/lib/format-timestamp";

type JobTimelineJob = {
  state: string;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  delay?: number;
};

const chipClass =
  "bg-muted/80 text-muted-foreground";

const activeChipClass =
  "bg-blue-500/15 text-blue-700 ring-1 ring-inset ring-blue-500/25 dark:text-blue-300";

export const JOB_TIMELINE_GRID_CLASS =
  "grid w-full grid-cols-[9rem_1.25rem_4.5rem_1.25rem_5rem_1.25rem_9rem] items-center";

function useLiveNow(enabled: boolean) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [enabled]);

  return now;
}

function TimelineArrow() {
  return (
    <div className="flex items-center justify-center px-1">
      <ChevronRightIcon
        className="size-3 shrink-0 text-muted-foreground/40"
        aria-hidden
      />
    </div>
  );
}

function TimelineTime({
  label,
  title,
  align = "right",
}: {
  label: string;
  title?: string;
  align?: "left" | "right";
}) {
  return (
    <span
      className={cn(
        "block whitespace-nowrap font-mono text-[11px] tabular-nums text-muted-foreground",
        align === "right" ? "pr-2 text-right" : "pl-2 text-left",
      )}
      title={title}
    >
      {label}
    </span>
  );
}

function TimelineChip({
  children,
  variant = "muted",
  title,
}: {
  children: React.ReactNode;
  variant?: "muted" | "active";
  title?: string;
}) {
  return (
    <div className="flex justify-center">
      <span
        className={cn(
          "inline-flex h-5 w-fit items-center justify-center gap-1 rounded-md px-1.5 font-mono text-[10px] tabular-nums",
          variant === "active" ? activeChipClass : chipClass,
        )}
        title={title}
      >
        {children}
      </span>
    </div>
  );
}

function TimelinePlaceholder() {
  return (
    <div className="flex justify-center">
      <span className="font-mono text-[11px] text-muted-foreground/35">—</span>
    </div>
  );
}

function getStartDelayMs(job: JobTimelineJob, now: number) {
  if (job.processedOn) return job.processedOn - job.timestamp;
  if (job.state === "delayed" && job.delay != null && job.delay > 0) {
    return job.delay;
  }
  if (!job.finishedOn) return now - job.timestamp;
  return undefined;
}

export function JobTimeline({ job }: { job: JobTimelineJob }) {
  const isRunning = !!job.processedOn && !job.finishedOn;
  const now = useLiveNow(
    isRunning || (!job.processedOn && !job.finishedOn),
  );

  const queued = formatJobTimestamp(job.timestamp, now);
  const startDelayMs = getStartDelayMs(job, now);
  const finish = job.finishedOn
    ? formatJobTimestamp(job.finishedOn, now)
    : undefined;

  const durationMs =
    isRunning && job.processedOn
      ? now - job.processedOn
      : job.processedOn && job.finishedOn
        ? job.finishedOn - job.processedOn
        : undefined;

  return (
    <div className={JOB_TIMELINE_GRID_CLASS}>
      <TimelineTime label={queued.label} title={queued.title} align="right" />

      <TimelineArrow />

      {startDelayMs != null && startDelayMs >= 0 ? (
        <TimelineChip
          title={
            job.processedOn
              ? `Waited ${formatElapsedMs(startDelayMs)} before starting`
              : job.state === "delayed"
                ? `Scheduled delay of ${formatElapsedMs(startDelayMs)}`
                : `Waiting ${formatElapsedMs(startDelayMs)}`
          }
        >
          {formatStartDelayMs(startDelayMs)}
        </TimelineChip>
      ) : (
        <TimelineChip>
          <span className="text-muted-foreground/35">—</span>
        </TimelineChip>
      )}

      <TimelineArrow />

      {durationMs != null ? (
        <TimelineChip
          variant={isRunning ? "active" : "muted"}
          title={
            isRunning
              ? `Running for ${formatElapsedMs(durationMs)}`
              : `Ran for ${formatElapsedMs(durationMs)}`
          }
        >
          {isRunning && <Loader2Icon className="size-3 shrink-0 animate-spin" />}
          {formatElapsedMs(durationMs)}
        </TimelineChip>
      ) : (
        <TimelineChip>
          <span className="text-muted-foreground/35">—</span>
        </TimelineChip>
      )}

      <TimelineArrow />

      {finish ? (
        <TimelineTime
          label={finish.label}
          title={finish.title ?? formatAbsoluteTimestamp(job.finishedOn!)}
          align="left"
        />
      ) : (
        <TimelinePlaceholder />
      )}
    </div>
  );
}
