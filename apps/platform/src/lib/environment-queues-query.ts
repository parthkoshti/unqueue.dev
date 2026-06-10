import { queryOptions } from "@tanstack/react-query";
import { rpcClient } from "@/lib/api";
import type { EnvironmentQueueRow } from "@/components/environment-queues-table";
import {
  environmentQueuesQueryKey,
  environmentRedisQueryKey,
} from "@/lib/queue-query-keys";

export { environmentQueuesQueryKey, environmentRedisQueryKey };

export function environmentQueuesQueryOptions(environmentId: string) {
  return queryOptions({
    queryKey: environmentQueuesQueryKey(environmentId),
    queryFn: async () => {
      const result = await rpcClient.queue.listForEnvironment({ environmentId });
      return result.queues as EnvironmentQueueRow[];
    },
    staleTime: Number.POSITIVE_INFINITY,
    refetchInterval: false,
    refetchOnWindowFocus: false,
  });
}

export function environmentQueuesForceRefreshOptions(environmentId: string) {
  return queryOptions({
    queryKey: environmentQueuesQueryKey(environmentId),
    queryFn: async () => {
      const result = await rpcClient.queue.listForEnvironment({
        environmentId,
        forceRefresh: true,
      });
      return result.queues as EnvironmentQueueRow[];
    },
  });
}

export function environmentRedisQueryOptions(environmentId: string) {
  return queryOptions({
    queryKey: environmentRedisQueryKey(environmentId),
    queryFn: () => rpcClient.redis.list({ environmentId }),
    refetchInterval: 30_000,
  });
}
