import { io, type Socket } from "socket.io-client";
import { apiUrl } from "./api-url";

type SocketEvent = {
  room: string;
  type: string;
  payload: unknown;
  seq: number;
};

let socket: Socket | null = null;
const lastSeq: Record<string, number> = {};
const subscribedRoomCounts = new Map<string, number>();
const eventHandlers = new Set<(data: SocketEvent) => void>();
const resyncHandlers = new Set<(data: { room: string }) => void>();

function getActiveRooms(): string[] {
  return [...subscribedRoomCounts.keys()];
}

function dispatchEvent(data: SocketEvent) {
  lastSeq[data.room] = data.seq;
  for (const handler of eventHandlers) {
    handler(data);
  }
}

function emitSubscribe() {
  const rooms = getActiveRooms();
  if (rooms.length === 0) return;
  getSocket().emit("subscribe", { rooms, lastSeq: { ...lastSeq } });
}

function attachSocketListeners(s: Socket) {
  s.on("connect", () => {
    emitSubscribe();
  });

  s.on("event", (data: SocketEvent) => {
    dispatchEvent(data);
  });

  s.on("sync", (data: { room: string; events: SocketEvent[] }) => {
    for (const event of data.events) {
      dispatchEvent({ ...event, room: data.room });
    }
  });

  s.on("resync", (data: { room: string }) => {
    for (const handler of resyncHandlers) {
      handler(data);
    }
  });
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(apiUrl, {
      path: "/socket.io",
      withCredentials: true,
      autoConnect: true,
    });
    attachSocketListeners(socket);
  }
  return socket;
}

export function subscribeRooms(rooms: string[]) {
  let changed = false;
  for (const room of rooms) {
    const count = subscribedRoomCounts.get(room) ?? 0;
    subscribedRoomCounts.set(room, count + 1);
    if (count === 0) changed = true;
  }
  if (changed) {
    emitSubscribe();
  }
}

export function unsubscribeRooms(rooms: string[]) {
  const toRemove: string[] = [];
  for (const room of rooms) {
    const count = subscribedRoomCounts.get(room) ?? 0;
    if (count <= 1) {
      subscribedRoomCounts.delete(room);
      toRemove.push(room);
    } else {
      subscribedRoomCounts.set(room, count - 1);
    }
  }
  if (toRemove.length > 0) {
    getSocket().emit("unsubscribe", { rooms: toRemove });
  }
}

export function onSocketEvent(
  handler: (data: SocketEvent) => void,
) {
  eventHandlers.add(handler);
  return () => {
    eventHandlers.delete(handler);
  };
}

export function onResync(handler: (data: { room: string }) => void) {
  resyncHandlers.add(handler);
  return () => {
    resyncHandlers.delete(handler);
  };
}
