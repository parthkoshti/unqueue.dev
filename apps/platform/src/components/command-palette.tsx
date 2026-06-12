import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@unqueue/ui/components/command";
import { environmentQueuesQueryOptions } from "@/lib/environment-queues-query";
import type { EnvironmentQueueRow } from "@/components/environment-queues-table";
import { cn } from "@/lib/utils";

type QueueHealth = "failed" | "paused" | "backlog" | "active" | "idle";

const HEALTH_DOT: Record<QueueHealth, string> = {
  failed: "bg-destructive",
  paused: "bg-amber-500",
  backlog: "bg-sky-500",
  active: "bg-blue-500",
  idle: "bg-emerald-500/50",
};

function getQueueHealth(queue: EnvironmentQueueRow): QueueHealth {
  if (queue.counts.failed > 0) return "failed";
  if (queue.isPaused) return "paused";
  if (queue.counts.waiting + queue.counts.delayed >= 10) return "backlog";
  if (queue.counts.active > 0) return "active";
  return "idle";
}

export function CommandPalette({
  workspaceId,
  environmentId,
  open,
  onOpenChange,
}: {
  workspaceId: string;
  environmentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();

  const queuesQuery = useQuery({
    ...environmentQueuesQueryOptions(environmentId),
    enabled: open,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onOpenChange]);

  const go = (fn: () => void) => {
    fn();
    onOpenChange(false);
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search queues, pages, settings..." />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Platform">
          <CommandItem
            onSelect={() =>
              go(() =>
                navigate({
                  to: "/$workspaceId/$environmentId",
                  params: { workspaceId, environmentId },
                }),
              )
            }
          >
            Overview
          </CommandItem>
          <CommandItem
            onSelect={() =>
              go(() =>
                navigate({
                  to: "/$workspaceId/bookmarks",
                  params: { workspaceId },
                }),
              )
            }
          >
            Bookmarks
          </CommandItem>
          <CommandItem
            onSelect={() =>
              go(() =>
                navigate({
                  to: "/$workspaceId/connections",
                  params: { workspaceId },
                }),
              )
            }
          >
            Connections
          </CommandItem>
          <CommandItem
            onSelect={() =>
              go(() =>
                navigate({
                  to: "/$workspaceId/settings/alerts",
                  params: { workspaceId },
                }),
              )
            }
          >
            Alerts
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Workspace">
          <CommandItem
            onSelect={() =>
              go(() =>
                navigate({
                  to: "/$workspaceId/settings/environments",
                  params: { workspaceId },
                }),
              )
            }
          >
            Environments
          </CommandItem>
          <CommandItem
            onSelect={() =>
              go(() =>
                navigate({
                  to: "/$workspaceId/settings/members",
                  params: { workspaceId },
                }),
              )
            }
          >
            Members
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Queues">
          {(queuesQuery.data ?? []).map((queue) => (
            <CommandItem
              key={`${queue.redisInstanceId}-${queue.name}`}
              onSelect={() =>
                go(() =>
                  navigate({
                    to: "/$workspaceId/$environmentId/queues/$queueName",
                    params: {
                      workspaceId,
                      environmentId,
                      queueName: queue.name,
                    },
                    search: { redisInstanceId: queue.redisInstanceId },
                  }),
                )
              }
            >
              <span className={cn("size-1.5 shrink-0 rounded-full", HEALTH_DOT[getQueueHealth(queue)])} />
              {queue.name}
              {queue.counts.failed > 0 && (
                <span className="ml-auto text-xs text-destructive">
                  {queue.counts.failed} failed
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
