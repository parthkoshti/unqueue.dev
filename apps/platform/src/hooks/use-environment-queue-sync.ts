import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { EnvironmentQueueRow } from "@/components/environment-queues-table";
import {
  applyQueueAdded,
  applyQueueCountsPatch,
  applyQueueRemoved,
  parseRedisDiscoveryRoom,
} from "@/lib/queue-cache-updates";
import { onSocketEvent, subscribeRooms, unsubscribeRooms } from "@/lib/socket";

export function useEnvironmentQueueSync(
  environmentId: string,
  queues: EnvironmentQueueRow[],
  redisInstanceIds: string[],
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const queueRooms = queues.map(
      (queue) => `queue:${queue.redisInstanceId}:${queue.name}`,
    );
    const redisRooms = redisInstanceIds.map((id) => `redis:${id}`);
    const rooms = [...new Set([...queueRooms, ...redisRooms])];

    if (rooms.length === 0) return;

    subscribeRooms(rooms);

    const offEvent = onSocketEvent((data) => {
      if (data.type === "queue:counts") {
        applyQueueCountsPatch(
          queryClient,
          environmentId,
          data.room,
          data.payload,
        );
        return;
      }

      if (data.type === "queue:added" || data.type === "queue:removed") {
        const redisInstanceId = parseRedisDiscoveryRoom(data.room);
        if (!redisInstanceId) return;

        const payload = data.payload as { queueName?: string };
        const queueName = payload.queueName;
        if (!queueName) return;

        if (data.type === "queue:added") {
          applyQueueAdded(
            queryClient,
            environmentId,
            redisInstanceId,
            queueName,
          );
        } else {
          applyQueueRemoved(
            queryClient,
            environmentId,
            redisInstanceId,
            queueName,
          );
        }
      }
    });

    return () => {
      offEvent();
      unsubscribeRooms(rooms);
    };
  }, [environmentId, queues, redisInstanceIds, queryClient]);
}
