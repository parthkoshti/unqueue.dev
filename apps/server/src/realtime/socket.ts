import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { Auth } from "@unstall/auth";
import type { Database } from "@unstall/db";
import type { Logger } from "@unstall/logger";
import { workspaceMembers } from "@unstall/db/schema";
import { eq } from "drizzle-orm";
import type { RealtimeManager } from "./manager.js";

export function attachSocketServer(
  httpServer: HttpServer,
  auth: Auth,
  db: Database,
  realtime: RealtimeManager,
  logger: Logger,
  platformURL: string,
): Server {
  const io = new Server(httpServer, {
    path: "/socket.io",
    cors: {
      origin: platformURL,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const cookie = socket.request.headers.cookie;
      const session = await auth.api.getSession({
        headers: new Headers(cookie ? { cookie } : {}),
      });

      if (!session?.user) {
        return next(new Error("Unauthorized"));
      }

      const memberships = await db
        .select({ workspaceId: workspaceMembers.workspaceId })
        .from(workspaceMembers)
        .where(eq(workspaceMembers.userId, session.user.id));

      socket.data.userId = session.user.id;
      socket.data.workspaceIds = memberships.map((m) => m.workspaceId);
      next();
    } catch (error) {
      logger.error({ error }, "Socket auth failed");
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on(
      "subscribe",
      (data: { rooms: string[]; lastSeq?: Record<string, number> }) => {
        const { rooms, lastSeq = {} } = data;

        for (const room of rooms) {
          if (
            !canJoinRoom(room, socket.data.workspaceIds, realtime)
          ) {
            continue;
          }
          socket.join(room);

          const queueRoom = parseQueueRoom(room);
          if (queueRoom) {
            void realtime.refreshCounts(
              queueRoom.redisInstanceId,
              queueRoom.queueName,
            );
          }

          if (realtime.shouldResync(room, lastSeq[room] ?? 0)) {
            socket.emit("resync", { room });
          } else {
            const events = realtime.getEventsSince(room, lastSeq[room] ?? 0);
            if (events.length > 0) {
              socket.emit("sync", { room, events });
            }
          }
        }
      },
    );

    socket.on("unsubscribe", (data: { rooms: string[] }) => {
      for (const room of data.rooms) {
        socket.leave(room);
      }
    });
  });

  return io;
}

function parseQueueRoom(room: string): {
  redisInstanceId: string;
  queueName: string;
} | null {
  if (!room.startsWith("queue:")) return null;
  const rest = room.slice("queue:".length);
  const colon = rest.indexOf(":");
  if (colon === -1) return null;
  return {
    redisInstanceId: rest.slice(0, colon),
    queueName: rest.slice(colon + 1),
  };
}

function parseRedisInstanceIdFromRoom(room: string): string | null {
  if (room.startsWith("redis:")) {
    return room.slice("redis:".length) || null;
  }
  if (room.startsWith("queue:")) {
    const rest = room.slice("queue:".length);
    const colon = rest.indexOf(":");
    return colon === -1 ? rest : rest.slice(0, colon);
  }
  if (room.startsWith("job:")) {
    const rest = room.slice("job:".length);
    const firstColon = rest.indexOf(":");
    if (firstColon === -1) return rest || null;
    const secondColon = rest.indexOf(":", firstColon + 1);
    return rest.slice(0, secondColon === -1 ? undefined : secondColon);
  }
  return null;
}

function canJoinRoom(
  room: string,
  workspaceIds: string[],
  realtime: RealtimeManager,
): boolean {
  if (room.startsWith("workspace:")) {
    const id = room.slice("workspace:".length);
    return workspaceIds.includes(id);
  }

  const redisInstanceId = parseRedisInstanceIdFromRoom(room);
  if (redisInstanceId) {
    const workspaceId = realtime.getWorkspaceIdForInstance(redisInstanceId);
    if (!workspaceId) return false;
    return workspaceIds.includes(workspaceId);
  }

  return false;
}
