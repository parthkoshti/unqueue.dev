import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { rpcClient } from "@/lib/api";
import { Badge } from "@unstall/ui/components/badge";
import { Button } from "@unstall/ui/components/button";
import { ScrollArea } from "@unstall/ui/components/scroll-area";

export const Route = createFileRoute("/$workspaceId/$environmentId/")({
  component: EnvironmentOverview,
});

function EnvironmentOverview() {
  const { workspaceId, environmentId } = Route.useParams();

  const redisQuery = useQuery({
    queryKey: ["redis", environmentId],
    queryFn: () => rpcClient.redis.list({ environmentId }),
  });

  const queuesQuery = useQuery({
    queryKey: ["queues", environmentId, redisQuery.data],
    queryFn: async () => {
      const instances = redisQuery.data ?? [];
      const results = await Promise.all(
        instances.map(async (instance) => {
          const queues = await rpcClient.queue.list({
            redisInstanceId: instance.id,
          });
          return queues.map((q) => ({ ...q, redisInstanceId: instance.id }));
        }),
      );
      return results.flat();
    },
    enabled: !!redisQuery.data,
  });

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-2">
        <h1 className="text-sm font-medium">Queues</h1>
        <Button
          size="sm"
          variant="outline"
          onClick={() => queuesQuery.refetch()}
        >
          Refresh
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-[var(--color-background)]">
            <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-muted-foreground)]">
              <th className="px-4 py-2 font-medium">Queue</th>
              <th className="px-4 py-2 font-medium">Waiting</th>
              <th className="px-4 py-2 font-medium">Active</th>
              <th className="px-4 py-2 font-medium">Failed</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {(queuesQuery.data ?? []).map((queue) => (
              <tr
                key={`${queue.redisInstanceId}-${queue.name}`}
                className="border-b border-[var(--color-border)] hover:bg-[var(--color-accent)]/50"
              >
                <td className="px-4 py-2">
                  <Link
                    to="/$workspaceId/$environmentId/queues/$queueName"
                    params={{
                      workspaceId,
                      environmentId,
                      queueName: queue.name,
                    }}
                    search={{ redisInstanceId: queue.redisInstanceId }}
                    className="font-medium hover:underline"
                  >
                    {queue.name}
                  </Link>
                </td>
                <td className="px-4 py-2">{queue.counts.waiting}</td>
                <td className="px-4 py-2">{queue.counts.active}</td>
                <td className="px-4 py-2">{queue.counts.failed}</td>
                <td className="px-4 py-2">
                  {queue.isPaused ? (
                    <Badge variant="warning">Paused</Badge>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </div>
  );
}
