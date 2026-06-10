import { Queue } from "bullmq";
import type { RedisConnection } from "./redis-types.js";

export async function discoverQueues(
  connection: RedisConnection,
  prefix: string,
): Promise<string[]> {
  try {
    const getRegistry = (Queue as unknown as { getRegistry?: Function }).getRegistry;
    if (getRegistry) {
      const registry = await getRegistry(connection, { prefix });
      if (registry?.queues?.length > 0) {
        return registry.queues.map((q: { name: string }) => q.name);
      }
    }
  } catch {
    // fall through to SCAN
  }

  return scanForQueues(connection, prefix);
}

async function scanForQueues(connection: RedisConnection, prefix: string): Promise<string[]> {
  const pattern = `${prefix}:*:meta`;
  const queues = new Set<string>();
  let cursor = "0";

  do {
    const [nextCursor, keys] = await connection.scan(
      cursor,
      "MATCH",
      pattern,
      "COUNT",
      100,
    );
    cursor = nextCursor;

    for (const key of keys) {
      const parts = key.split(":");
      const metaIndex = parts.lastIndexOf("meta");
      if (metaIndex >= 2) {
        const queueName = parts.slice(1, metaIndex).join(":");
        if (queueName) {
          queues.add(queueName);
        }
      }
    }
  } while (cursor !== "0");

  return [...queues].sort();
}

export function diffQueues(
  previous: string[],
  current: string[],
): { added: string[]; removed: string[] } {
  const prevSet = new Set(previous);
  const currSet = new Set(current);
  return {
    added: current.filter((q) => !prevSet.has(q)),
    removed: previous.filter((q) => !currSet.has(q)),
  };
}
