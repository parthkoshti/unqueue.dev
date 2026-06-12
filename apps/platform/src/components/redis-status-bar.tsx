import { useQuery } from "@tanstack/react-query";
import { CircleIcon } from "lucide-react";
import { rpcClient } from "@/lib/api";
import { cn } from "@/lib/utils";

type ClientCount = {
  id: string;
  nickname: string;
  connectedClients: number | null;
};

function InstanceChip({ instance }: { instance: ClientCount }) {
  const connected = instance.connectedClients !== null;

  return (
    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
      <CircleIcon
        className={cn(
          "size-1.5 shrink-0 fill-current",
          connected
            ? "text-emerald-500 dark:text-emerald-400"
            : "text-muted-foreground/40",
        )}
      />
      <span className="max-w-[10rem] truncate font-medium">
        {instance.nickname}
      </span>
      <span className="tabular-nums">
        {connected ? `${instance.connectedClients} conn` : "—"}
      </span>
    </div>
  );
}

export function RedisStatusBar({ environmentId }: { environmentId: string }) {
  const { data } = useQuery({
    queryKey: ["redis", "clientCounts", environmentId],
    queryFn: () => rpcClient.redis.getClientCounts({ environmentId }),
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
  });

  if (!data || data.length === 0) return null;

  return (
    <div className="flex shrink-0 items-center gap-4 border-t bg-muted/30 px-4 py-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
        Redis
      </span>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {data.map((instance) => (
          <InstanceChip key={instance.id} instance={instance} />
        ))}
      </div>
    </div>
  );
}
