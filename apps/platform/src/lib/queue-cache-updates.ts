import type { QueryClient } from "@tanstack/react-query";
import type { EnvironmentQueueRow } from "@/components/environment-queues-table";
import { environmentQueuesQueryKey } from "@/lib/queue-query-keys";

type QueueCountsPayload = {
  counts: EnvironmentQueueRow["counts"];
  isPaused: boolean;
};

function parseQueueRoom(room: string): { redisInstanceId: string; queueName: string } | null {
  if (!room.startsWith("queue:")) return null;
  const rest = room.slice("queue:".length);
  const separator = rest.indexOf(":");
  if (separator === -1) return null;
  return {
    redisInstanceId: rest.slice(0, separator),
    queueName: rest.slice(separator + 1),
  };
}

export function applyQueueCountsPatch(
  queryClient: QueryClient,
  environmentId: string,
  room: string,
  payload: unknown,
): void {
  const parsed = parseQueueRoom(room);
  if (!parsed) return;

  const data = payload as QueueCountsPayload;
  if (!data?.counts) return;

  queryClient.setQueryData<EnvironmentQueueRow[]>(
    environmentQueuesQueryKey(environmentId),
    (old) => {
      if (!old) return old;
      return old.map((queue) =>
        queue.redisInstanceId === parsed.redisInstanceId &&
        queue.name === parsed.queueName
          ? { ...queue, counts: data.counts, isPaused: data.isPaused }
          : queue,
      );
    },
  );
}

export function applyQueueAdded(
  queryClient: QueryClient,
  environmentId: string,
  redisInstanceId: string,
  queueName: string,
): void {
  queryClient.setQueryData<EnvironmentQueueRow[]>(
    environmentQueuesQueryKey(environmentId),
    (old) => {
      if (!old) return old;
      if (
        old.some(
          (queue) =>
            queue.redisInstanceId === redisInstanceId && queue.name === queueName,
        )
      ) {
        return old;
      }
      return [
        ...old,
        {
          name: queueName,
          redisInstanceId,
          isPaused: false,
          counts: {
            waiting: 0,
            active: 0,
            delayed: 0,
            completed: 0,
            failed: 0,
            paused: 0,
          },
        },
      ];
    },
  );
}

export function applyQueueRemoved(
  queryClient: QueryClient,
  environmentId: string,
  redisInstanceId: string,
  queueName: string,
): void {
  queryClient.setQueryData<EnvironmentQueueRow[]>(
    environmentQueuesQueryKey(environmentId),
    (old) => {
      if (!old) return old;
      return old.filter(
        (queue) =>
          !(
            queue.redisInstanceId === redisInstanceId && queue.name === queueName
          ),
      );
    },
  );
}

export function parseRedisDiscoveryRoom(room: string): string | null {
  if (!room.startsWith("redis:")) return null;
  return room.slice("redis:".length) || null;
}
