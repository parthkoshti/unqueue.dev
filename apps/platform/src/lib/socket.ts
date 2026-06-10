import { io, type Socket } from "socket.io-client";

const apiUrl = import.meta.env.VITE_API_URL ?? window.location.origin;

let socket: Socket | null = null;
const lastSeq: Record<string, number> = {};

export function getSocket(): Socket {
  if (!socket) {
    socket = io(apiUrl, {
      path: "/socket.io",
      withCredentials: true,
      autoConnect: true,
    });

    socket.on("event", (data: { room: string; seq: number }) => {
      lastSeq[data.room] = data.seq;
    });
  }
  return socket;
}

export function subscribeRooms(rooms: string[]) {
  const s = getSocket();
  s.emit("subscribe", { rooms, lastSeq: { ...lastSeq } });
}

export function unsubscribeRooms(rooms: string[]) {
  getSocket().emit("unsubscribe", { rooms });
}

export function onSocketEvent(
  handler: (data: { room: string; type: string; payload: unknown; seq: number }) => void,
) {
  return getSocket().on("event", handler);
}

export function onResync(handler: (data: { room: string }) => void) {
  return getSocket().on("resync", handler);
}
