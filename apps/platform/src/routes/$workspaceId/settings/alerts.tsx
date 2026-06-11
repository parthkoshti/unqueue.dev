import { createFileRoute } from "@tanstack/react-router";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
import {
  BellIcon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-react";
import { z } from "zod";
import { rpcClient } from "@/lib/api";
import {
  environmentQueuesQueryOptions,
  environmentRedisQueryOptions,
} from "@/lib/environment-queues-query";
import { useShellContext } from "@/hooks/use-shell-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@unqueue/ui/components/label";
import { Badge } from "@unqueue/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@unqueue/ui/components/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/$workspaceId/settings/alerts")({
  component: AlertsSettings,
});

type Alert = Awaited<ReturnType<typeof rpcClient.alert.list>>[number];
type AlertEvent = Awaited<ReturnType<typeof rpcClient.alert.listEvents>>[number];
type RedisInstance = Awaited<ReturnType<typeof rpcClient.redis.list>>[number];

type AlertWithContext = Alert & {
  environmentId: string;
  environmentName: string;
  redisNickname: string;
};

type ConditionType =
  | "failure_rate"
  | "stalled"
  | "queue_lag"
  | "waiting_jobs";

type AlertFormValues = {
  name: string;
  queueSelection: string;
  webhookUrl: string;
  conditionType: ConditionType;
  threshold: number;
  windowMinutes: number;
  minStalledJobs: number;
  maxLagMs: number;
  waitingJobsThreshold: number;
  intervalMinutes: number;
  cooldownMinutes: number;
};

type EnvironmentQueueOption = {
  name: string;
  redisInstanceId: string;
  redisNickname: string;
};

function encodeQueueSelection(
  redisInstanceId: string,
  queueName: string,
): string {
  return `${redisInstanceId}:${queueName}`;
}

function decodeQueueSelection(value: string): {
  redisInstanceId: string;
  queueName: string;
} | null {
  const separator = value.indexOf(":");
  if (separator === -1) return null;

  return {
    redisInstanceId: value.slice(0, separator),
    queueName: value.slice(separator + 1),
  };
}

const CHECK_INTERVAL_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour" },
  { value: 240, label: "4 hours" },
  { value: 720, label: "12 hours" },
  { value: 1440, label: "24 hours" },
] as const;

const CHECK_INTERVAL_VALUES = CHECK_INTERVAL_OPTIONS.map(
  (option) => option.value,
);

const CONDITION_TYPES: {
  value: ConditionType;
  label: string;
  description: string;
}[] = [
  {
    value: "failure_rate",
    label: "Failure rate",
    description: "Fire when the share of failed jobs exceeds a threshold.",
  },
  {
    value: "stalled",
    label: "Stalled jobs",
    description: "Fire when stalled jobs accumulate on the queue.",
  },
  {
    value: "queue_lag",
    label: "Queue lag",
    description: "Fire when the oldest waiting job exceeds a max age.",
  },
  {
    value: "waiting_jobs",
    label: "Waiting jobs",
    description: "Fire when the waiting job count exceeds a threshold.",
  },
];

const defaultFormValues: AlertFormValues = {
  name: "",
  queueSelection: "",
  webhookUrl: "",
  conditionType: "failure_rate",
  threshold: 0.1,
  windowMinutes: 5,
  minStalledJobs: 1,
  maxLagMs: 60_000,
  waitingJobsThreshold: 100,
  intervalMinutes: 15,
  cooldownMinutes: 15,
};

function buildCondition(values: AlertFormValues) {
  switch (values.conditionType) {
    case "failure_rate":
      return {
        type: "failure_rate" as const,
        threshold: values.threshold,
        windowMinutes: values.windowMinutes,
      };
    case "stalled":
      return {
        type: "stalled" as const,
        minStalledJobs: values.minStalledJobs,
      };
    case "queue_lag":
      return {
        type: "queue_lag" as const,
        maxLagMs: values.maxLagMs,
      };
    case "waiting_jobs":
      return {
        type: "waiting_jobs" as const,
        threshold: values.waitingJobsThreshold,
      };
  }
}

type AlertConditionConfig =
  | { type: "failure_rate"; threshold: number; windowMinutes: number }
  | { type: "stalled"; minStalledJobs: number }
  | { type: "queue_lag"; maxLagMs: number }
  | { type: "waiting_jobs"; threshold: number };

function getCondition(config: Alert["config"]): AlertConditionConfig | null {
  const parsed = config as { condition?: AlertConditionConfig };
  return parsed.condition ?? null;
}

function formatCondition(config: Alert["config"]): string {
  const condition = getCondition(config);
  if (!condition) return "Unknown condition";

  switch (condition.type) {
    case "failure_rate":
      return `${Math.round(condition.threshold * 100)}% failure rate over ${condition.windowMinutes}m`;
    case "stalled":
      return `${condition.minStalledJobs}+ stalled jobs`;
    case "queue_lag":
      return `Lag over ${Math.round(condition.maxLagMs / 1000)}s`;
    case "waiting_jobs":
      return `${condition.threshold}+ waiting jobs`;
  }
}

function conditionTypeLabel(type: string) {
  return CONDITION_TYPES.find((c) => c.value === type)?.label ?? type;
}

function formatIntervalMinutes(minutes: number) {
  const option = CHECK_INTERVAL_OPTIONS.find((item) => item.value === minutes);
  if (option) return option.label;

  if (minutes % 1440 === 0) {
    const days = minutes / 1440;
    return days === 1 ? "1 day" : `${days} days`;
  }

  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }

  return minutes === 1 ? "1 minute" : `${minutes} minutes`;
}

function formatRelativeTime(at: Date | string) {
  const date = new Date(at);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function deleteConfirmPhrase(name: string) {
  return `delete ${name}`;
}

function ConditionTypeSelector({
  value,
  onChange,
  disabled,
}: {
  value: ConditionType;
  onChange: (type: ConditionType) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      {CONDITION_TYPES.map((option) => {
        const selected = value === option.value;

        return (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
              selected
                ? "border-primary/40 bg-primary/5"
                : "border-border/60 hover:bg-muted/30",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <input
              type="radio"
              name="condition-type"
              value={option.value}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(option.value)}
              className="mt-1 size-4 shrink-0"
            />
            <span className="min-w-0 space-y-0.5">
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground">
                {option.description}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

function CreateAlertForm({
  environmentId,
  canManage,
  onSuccess,
  onCancel,
}: {
  environmentId: string;
  canManage: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const [formError, setFormError] = useState<string | null>(null);

  const redisQuery = useQuery(environmentRedisQueryOptions(environmentId));

  const queuesQuery = useQuery(environmentQueuesQueryOptions(environmentId));

  const environmentQueues: EnvironmentQueueOption[] = (queuesQuery.data ?? [])
    .map((queue) => ({
      name: queue.name,
      redisInstanceId: queue.redisInstanceId,
      redisNickname:
        redisQuery.data?.find((instance) => instance.id === queue.redisInstanceId)
          ?.nickname ?? "",
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const hasRedisConnections = (redisQuery.data?.length ?? 0) > 0;
  const duplicateQueueNames = new Set(
    Object.entries(
      environmentQueues.reduce<Record<string, number>>((counts, queue) => {
        counts[queue.name] = (counts[queue.name] ?? 0) + 1;
        return counts;
      }, {}),
    )
      .filter(([, count]) => count > 1)
      .map(([name]) => name),
  );

  const queueOptions = environmentQueues.map((queue) => {
    const value = encodeQueueSelection(queue.redisInstanceId, queue.name);
    const showRedis = duplicateQueueNames.has(queue.name);

    return {
      value,
      label: showRedis ? `${queue.name} · ${queue.redisNickname}` : queue.name,
      keywords: `${queue.name} ${queue.redisNickname}`,
    };
  });

  const form = useForm({
    defaultValues: defaultFormValues,
    onSubmit: async ({ value }) => {
      if (!canManage) return;

      const queue = decodeQueueSelection(value.queueSelection);

      const parsed = z
        .object({
          name: z.string().trim().min(1, "Name is required"),
          queueSelection: z
            .string()
            .min(1, "Select a queue")
            .refine((selection) => decodeQueueSelection(selection) !== null, {
              message: "Select a queue",
            }),
          webhookUrl: z.string().url("Enter a valid Discord webhook URL"),
          conditionType: z.enum([
            "failure_rate",
            "stalled",
            "queue_lag",
            "waiting_jobs",
          ]),
          threshold: z.number().min(0).max(1),
          windowMinutes: z.number().int().min(1).max(1440),
          minStalledJobs: z.number().int().min(1),
          maxLagMs: z.number().int().min(1),
          waitingJobsThreshold: z.number().int().min(1),
          intervalMinutes: z
            .number()
            .int()
            .refine(
              (value) =>
                CHECK_INTERVAL_VALUES.includes(
                  value as (typeof CHECK_INTERVAL_VALUES)[number],
                ),
              { message: "Select a check interval" },
            ),
          cooldownMinutes: z.number().int().min(1),
        })
        .safeParse(value);

      if (!parsed.success) {
        setFormError(parsed.error.errors[0]?.message ?? "Invalid form values");
        return;
      }

      if (!queue) {
        setFormError("Select a queue");
        return;
      }

      setFormError(null);

      try {
        await rpcClient.alert.create({
          environmentId,
          redisInstanceId: queue.redisInstanceId,
          name: parsed.data.name,
          queueName: queue.queueName,
          webhookUrl: parsed.data.webhookUrl,
          condition: buildCondition({
            ...value,
            ...parsed.data,
          }),
          intervalMinutes: parsed.data.intervalMinutes,
          cooldownMinutes: parsed.data.cooldownMinutes,
        });
        onSuccess();
      } catch (error) {
        setFormError(
          error instanceof Error ? error.message : "Failed to create alert",
        );
      }
    },
  });

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
    >
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <form.Field
          name="name"
          validators={{
            onChange: ({ value }) =>
              !value.trim() ? "Name is required" : undefined,
          }}
        >
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="alert-name">Name</Label>
              <Input
                id="alert-name"
                placeholder="High failure rate on emails"
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={!!field.state.meta.errors.length}
              />
              {field.state.meta.errors[0] && (
                <p className="text-xs text-destructive">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field
          name="queueSelection"
          validators={{
            onChange: ({ value }) =>
              !value ? "Select a queue" : undefined,
          }}
        >
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="alert-queue">Queue</Label>
              {!hasRedisConnections ? (
                <p className="text-xs text-muted-foreground">
                  Add a Redis connection before creating alerts.
                </p>
              ) : (
                <Combobox
                  id="alert-queue"
                  value={field.state.value}
                  onValueChange={field.handleChange}
                  options={queueOptions}
                  placeholder="Select a queue"
                  searchPlaceholder="Search queues..."
                  emptyText={
                    queuesQuery.isLoading
                      ? "Loading queues..."
                      : "No queues found in this environment."
                  }
                  loading={redisQuery.isLoading || queuesQuery.isLoading}
                  invalid={!!field.state.meta.errors.length}
                />
              )}
              <p className="text-xs text-muted-foreground">
                Queues are discovered from all Redis connections in this
                environment.
              </p>
              {field.state.meta.errors[0] && (
                <p className="text-xs text-destructive">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field
          name="webhookUrl"
          validators={{
            onChange: ({ value }) => {
              if (!value.trim()) return "Webhook URL is required";
              if (!z.string().url().safeParse(value.trim()).success) {
                return "Enter a valid Discord webhook URL";
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <div className="space-y-1.5">
              <Label htmlFor="alert-webhook">Discord webhook URL</Label>
              <Input
                id="alert-webhook"
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={field.state.value}
                onChange={(e) => field.handleChange(e.target.value)}
                className="font-sans"
                aria-invalid={!!field.state.meta.errors.length}
              />
              <p className="text-xs text-muted-foreground">
                Alerts are sent as Discord embeds when conditions are met.
              </p>
              {field.state.meta.errors[0] && (
                <p className="text-xs text-destructive">
                  {field.state.meta.errors[0]}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="conditionType">
          {(field) => (
            <div className="space-y-2">
              <Label>Condition</Label>
              <ConditionTypeSelector
                value={field.state.value}
                onChange={field.handleChange}
                disabled={!canManage}
              />
            </div>
          )}
        </form.Field>

        {form.state.values.conditionType === "failure_rate" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <form.Field name="threshold">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor="alert-threshold">Failure rate (0–1)</Label>
                  <Input
                    id="alert-threshold"
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    e.g. 0.1 = 10% of jobs failed
                  </p>
                </div>
              )}
            </form.Field>
            <form.Field name="windowMinutes">
              {(field) => (
                <div className="space-y-1.5">
                  <Label htmlFor="alert-window">Window (minutes)</Label>
                  <Input
                    id="alert-window"
                    type="number"
                    min={1}
                    max={1440}
                    value={field.state.value}
                    onChange={(e) => field.handleChange(Number(e.target.value))}
                  />
                </div>
              )}
            </form.Field>
          </div>
        )}

        {form.state.values.conditionType === "stalled" && (
          <form.Field name="minStalledJobs">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="alert-stalled">Minimum stalled jobs</Label>
                <Input
                  id="alert-stalled"
                  type="number"
                  min={1}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
              </div>
            )}
          </form.Field>
        )}

        {form.state.values.conditionType === "queue_lag" && (
          <form.Field name="maxLagMs">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="alert-lag">Max lag (milliseconds)</Label>
                <Input
                  id="alert-lag"
                  type="number"
                  min={1}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
                <p className="text-xs text-muted-foreground">
                  Fire when the oldest waiting job is older than this.
                </p>
              </div>
            )}
          </form.Field>
        )}

        {form.state.values.conditionType === "waiting_jobs" && (
          <form.Field name="waitingJobsThreshold">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="alert-waiting">Waiting job threshold</Label>
                <Input
                  id="alert-waiting"
                  type="number"
                  min={1}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
              </div>
            )}
          </form.Field>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <form.Field name="intervalMinutes">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="alert-interval">Check interval</Label>
                <Select
                  value={String(field.state.value)}
                  onValueChange={(value) => field.handleChange(Number(value))}
                >
                  <SelectTrigger id="alert-interval" className="w-full">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {CHECK_INTERVAL_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={String(option.value)}
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </form.Field>
          <form.Field name="cooldownMinutes">
            {(field) => (
              <div className="space-y-1.5">
                <Label htmlFor="alert-cooldown">Cooldown (min)</Label>
                <Input
                  id="alert-cooldown"
                  type="number"
                  min={1}
                  value={field.state.value}
                  onChange={(e) => field.handleChange(Number(e.target.value))}
                />
              </div>
            )}
          </form.Field>
        </div>

        {formError && (
          <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            {formError}
          </p>
        )}
      </div>

      <SheetFooter className="border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          loading={form.state.isSubmitting}
          loadingText="Creating..."
          disabled={!canManage || !hasRedisConnections}
        >
          Create alert
        </Button>
      </SheetFooter>
    </form>
  );
}

function AlertDetailSheet({
  alert,
  canManage,
  onClose,
  onDeleted,
}: {
  alert: AlertWithContext;
  canManage: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const deletePhrase = deleteConfirmPhrase(alert.name);
  const deleteConfirmed = deleteConfirm === deletePhrase;

  const eventsQuery = useQuery({
    queryKey: ["alert-events", alert.id],
    queryFn: () => rpcClient.alert.listEvents({ alertId: alert.id }),
  });

  const events = (eventsQuery.data ?? []).sort(
    (a, b) => new Date(b.firedAt).getTime() - new Date(a.firedAt).getTime(),
  );

  const condition = getCondition(alert.config);

  const handleDelete = async () => {
    if (!deleteConfirmed) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await rpcClient.alert.delete({ id: alert.id });
      onDeleted();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Failed to delete alert",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/20 p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-medium">{alert.name}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {alert.queueName}
              </p>
            </div>
            <Badge
              variant={alert.enabled ? "success" : "outline"}
              className="shrink-0 normal-case tracking-normal"
            >
              {alert.enabled ? "Active" : "Disabled"}
            </Badge>
          </div>

          <div className="grid gap-2 text-xs text-muted-foreground">
            <p>
              Environment{" "}
              <span className="text-foreground">{alert.environmentName}</span>
            </p>
            <p>
              Redis{" "}
              <span className="text-foreground">{alert.redisNickname}</span>
            </p>
            <p>
              Condition{" "}
              <span className="text-foreground">
                {condition ? conditionTypeLabel(condition.type) : "Unknown"}
              </span>
              {" · "}
              <span className="text-foreground">
                {formatCondition(alert.config)}
              </span>
            </p>
            <p>
              Checks every{" "}
              <span className="text-foreground">
                {formatIntervalMinutes(alert.intervalMinutes)}
              </span>
              {" · "}
              Cooldown{" "}
              <span className="text-foreground">{alert.cooldownMinutes}m</span>
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium">Recent events</p>
          {eventsQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <p className="rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground">
              No events yet. This alert has not fired.
            </p>
          ) : (
            <ul className="space-y-2">
              {events.slice(0, 10).map((event) => (
                <AlertEventRow key={event.id} event={event} />
              ))}
            </ul>
          )}
        </div>

        {canManage && (
          <div className="space-y-3 rounded-lg border border-destructive/30 p-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-destructive">Delete alert</p>
              <p className="text-xs text-muted-foreground">
                Stops monitoring and removes the Discord webhook. Type{" "}
                <span className="font-mono text-foreground">{deletePhrase}</span>{" "}
                to confirm.
              </p>
            </div>
            <Input
              value={deleteConfirm}
              onChange={(e) => {
                setDeleteConfirm(e.target.value);
                setDeleteError(null);
              }}
              placeholder={deletePhrase}
              className="font-mono text-xs"
              autoComplete="off"
            />
            {deleteError && (
              <p className="text-xs text-destructive">{deleteError}</p>
            )}
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              loading={isDeleting}
              loadingText="Deleting..."
              disabled={!deleteConfirmed}
              onClick={() => void handleDelete()}
            >
              <Trash2Icon />
              Delete alert
            </Button>
          </div>
        )}
      </div>

      <SheetFooter className="border-t">
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
      </SheetFooter>
    </>
  );
}

function AlertEventRow({ event }: { event: AlertEvent }) {
  const resolved = !!event.resolvedAt;

  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-border/60 px-3 py-2 text-xs">
      <div className="min-w-0">
        <p className="font-medium capitalize">{event.status}</p>
        <p className="text-muted-foreground">
          {formatRelativeTime(event.firedAt)}
          {resolved && event.resolvedAt && (
            <>
              {" · "}
              Resolved {formatRelativeTime(event.resolvedAt)}
            </>
          )}
        </p>
      </div>
      <Badge
        variant={resolved ? "outline" : "destructive"}
        className="shrink-0 normal-case tracking-normal"
      >
        {resolved ? "Resolved" : "Firing"}
      </Badge>
    </li>
  );
}

function AlertCard({
  alert,
  canManage,
  onSelect,
}: {
  alert: AlertWithContext;
  canManage: boolean;
  onSelect: () => void;
}) {
  const condition = getCondition(alert.config);

  return (
    <Card
      className={cn(
        "flex h-full flex-col",
        "cursor-pointer transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
      )}
      tabIndex={0}
      role="button"
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-2">
        <div className="min-w-0 space-y-1">
          <CardTitle className="truncate text-sm">{alert.name}</CardTitle>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {alert.queueName}
          </p>
        </div>
        <Badge
          variant={alert.enabled ? "success" : "outline"}
          className="shrink-0 normal-case tracking-normal"
        >
          {alert.enabled ? "Active" : "Disabled"}
        </Badge>
      </CardHeader>
      <CardContent className="mt-auto space-y-2 text-xs text-muted-foreground">
        <p>
          {alert.environmentName} · {alert.redisNickname}
        </p>
        <p>
          <span className="text-foreground">
            {condition ? conditionTypeLabel(condition.type) : "Unknown"}
          </span>
          {" · "}
          {formatCondition(alert.config)}
        </p>
        <p>
          Every {formatIntervalMinutes(alert.intervalMinutes)} ·{" "}
          {alert.cooldownMinutes}m cooldown
        </p>
        {!canManage && (
          <p className="text-[10px]">View only — admin access required to edit</p>
        )}
      </CardContent>
    </Card>
  );
}

function AlertsSettings() {
  const { workspaceId } = Route.useParams();
  const { environmentId, isResolvingContext } = useShellContext();
  const queryClient = useQueryClient();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "detail">("create");
  const [selectedAlert, setSelectedAlert] = useState<AlertWithContext | null>(
    null,
  );

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => rpcClient.workspace.list(),
  });

  const envsQuery = useQuery({
    queryKey: ["environments", workspaceId],
    queryFn: () => rpcClient.environment.list({ workspaceId }),
  });

  const workspace = workspacesQuery.data?.find((w) => w.id === workspaceId);
  const activeEnvironment = envsQuery.data?.find((e) => e.id === environmentId);
  const canManage =
    workspace?.role === "owner" || workspace?.role === "admin";

  const environments = envsQuery.data ?? [];

  const alertQueries = useQueries({
    queries: environments.map((environment) => ({
      queryKey: ["alerts", environment.id],
      queryFn: () => rpcClient.alert.list({ environmentId: environment.id }),
    })),
  });

  const redisQueries = useQueries({
    queries: environments.map((environment) => ({
      queryKey: ["redis", environment.id],
      queryFn: () => rpcClient.redis.list({ environmentId: environment.id }),
    })),
  });

  const redisById = new Map<string, RedisInstance & { environmentName: string }>();
  environments.forEach((environment, index) => {
    for (const instance of redisQueries[index]?.data ?? []) {
      redisById.set(instance.id, {
        ...instance,
        environmentName: environment.name,
      });
    }
  });

  const alerts: AlertWithContext[] = environments
    .flatMap((environment, index) =>
      (alertQueries[index]?.data ?? []).map((alert) => ({
        ...alert,
        environmentId: environment.id,
        environmentName: environment.name,
        redisNickname:
          redisById.get(alert.redisInstanceId)?.nickname ?? "Unknown",
      })),
    )
    .sort((a, b) => {
      const envCompare = a.environmentName.localeCompare(b.environmentName);
      if (envCompare !== 0) return envCompare;
      return a.name.localeCompare(b.name);
    });

  const activeCount = alerts.filter((a) => a.enabled).length;
  const isLoading =
    envsQuery.isLoading ||
    alertQueries.some((q) => q.isLoading) ||
    redisQueries.some((q) => q.isLoading);
  const isFetching = alertQueries.some((q) => q.isFetching);

  const openCreateSheet = () => {
    setSheetMode("create");
    setSelectedAlert(null);
    setSheetOpen(true);
  };

  const openDetailSheet = (alert: AlertWithContext) => {
    setSheetMode("detail");
    setSelectedAlert(alert);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setSelectedAlert(null);
  };

  const refreshAlerts = () => {
    void queryClient.invalidateQueries({ queryKey: ["alerts"] });
  };

  const handleSheetSuccess = async () => {
    closeSheet();
    await queryClient.invalidateQueries({ queryKey: ["alerts"] });
  };

  if (isResolvingContext || envsQuery.isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!environmentId) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          No environment found. Create an environment before setting up alerts.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-start justify-between gap-4 border-b px-4 py-3">
        <div className="min-w-0 space-y-1">
          <h1 className="truncate font-medium">Alerts</h1>
          <p className="text-xs text-muted-foreground">
            Monitor queue health and get notified in Discord when conditions are
            met. New alerts are added to{" "}
            <span className="font-medium text-foreground">
              {activeEnvironment?.name ?? "the active environment"}
            </span>
            .
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAlerts}
            disabled={isFetching}
          >
            <RefreshCwIcon
              className={isFetching ? "animate-spin" : undefined}
            />
            Refresh
          </Button>
          {canManage && (
            <Button size="sm" onClick={openCreateSheet}>
              <PlusIcon />
              Create alert
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {!isLoading && alerts.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {activeCount} of {alerts.length}{" "}
              {alerts.length === 1 ? "alert" : "alerts"} active
            </p>
          )}

          {!canManage && (
            <p className="rounded-md border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Only workspace admins can create or delete alerts.
            </p>
          )}

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex size-10 items-center justify-center rounded-full bg-muted">
                  <BellIcon className="size-4 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium">No alerts configured</p>
                  <p className="max-w-sm text-xs text-muted-foreground">
                    Get notified in Discord when failure rates spike, jobs stall,
                    or queues back up.
                  </p>
                </div>
                {canManage && (
                  <Button size="sm" onClick={openCreateSheet}>
                    <PlusIcon />
                    Create your first alert
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {alerts.map((alert) => (
                <li key={alert.id} className="min-h-0">
                  <AlertCard
                    alert={alert}
                    canManage={canManage}
                    onSelect={() => openDetailSheet(alert)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b">
            <SheetTitle>
              {sheetMode === "create" ? "Create alert" : "Alert details"}
            </SheetTitle>
            <SheetDescription>
              {sheetMode === "create"
                ? "Monitor a queue and send Discord notifications when a condition is met."
                : "View alert configuration and recent firing history."}
            </SheetDescription>
          </SheetHeader>

          {sheetMode === "create" && environmentId && (
            <CreateAlertForm
              key="create"
              environmentId={environmentId}
              canManage={canManage}
              onSuccess={() => void handleSheetSuccess()}
              onCancel={closeSheet}
            />
          )}

          {sheetMode === "detail" && selectedAlert && (
            <AlertDetailSheet
              key={selectedAlert.id}
              alert={selectedAlert}
              canManage={canManage}
              onClose={closeSheet}
              onDeleted={() => void handleSheetSuccess()}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
