import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";

export type SocketStatus = "connected" | "connecting" | "disconnected";

export function useSocketStatus(): SocketStatus {
  const [status, setStatus] = useState<SocketStatus>(() =>
    getSocket().connected ? "connected" : "connecting",
  );

  useEffect(() => {
    const socket = getSocket();

    function onConnect() {
      setStatus("connected");
    }
    function onDisconnect() {
      setStatus("disconnected");
    }
    function onReconnectAttempt() {
      setStatus("connecting");
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect_attempt", onReconnectAttempt);

    setStatus(socket.connected ? "connected" : "connecting");

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect_attempt", onReconnectAttempt);
    };
  }, []);

  return status;
}
