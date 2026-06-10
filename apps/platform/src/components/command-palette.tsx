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
} from "@unstall/ui/components/command";
import { environmentQueuesQueryOptions } from "@/lib/environment-queues-query";

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
