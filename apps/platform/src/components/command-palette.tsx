import { useEffect, useState } from "react";
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
import { rpcClient } from "@/lib/api";

export function CommandPalette({
  workspaceId,
  environmentId,
}: {
  workspaceId: string;
  environmentId: string;
}) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const queuesQuery = useQuery({
    queryKey: ["redis-queues", environmentId],
    queryFn: async () => {
      const redisList = await rpcClient.redis.list({ environmentId });
      const allQueues = await Promise.all(
        redisList.map((r) =>
          rpcClient.queue.list({ redisInstanceId: r.id }).then((queues) =>
            queues.map((q) => ({ ...q, redisInstanceId: r.id })),
          ),
        ),
      );
      return allQueues.flat();
    },
    enabled: open,
  });

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Navigate to queue..." />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>
        <CommandGroup heading="Navigation">
          <CommandItem
            onSelect={() => {
              navigate({
                to: "/$workspaceId/$environmentId",
                params: { workspaceId, environmentId },
              });
              setOpen(false);
            }}
          >
            Environment overview
          </CommandItem>
          <CommandItem
            onSelect={() => {
              navigate({
                to: "/$workspaceId/bookmarks",
                params: { workspaceId },
              });
              setOpen(false);
            }}
          >
            Bookmarks
          </CommandItem>
          <CommandItem
            onSelect={() => {
              navigate({
                to: "/$workspaceId/settings/members",
                params: { workspaceId },
              });
              setOpen(false);
            }}
          >
            Settings
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Queues">
          {(queuesQuery.data ?? []).map((queue) => (
            <CommandItem
              key={`${queue.redisInstanceId}-${queue.name}`}
              onSelect={() => {
                navigate({
                  to: "/$workspaceId/$environmentId/queues/$queueName",
                  params: {
                    workspaceId,
                    environmentId,
                    queueName: queue.name,
                  },
                  search: { redisInstanceId: queue.redisInstanceId },
                });
                setOpen(false);
              }}
            >
              {queue.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
