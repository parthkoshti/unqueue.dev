import { useSocketStatus } from "@/hooks/use-socket-status";

const statusConfig = {
  connected: { label: "Realtime: connected", color: "bg-green-500", ping: true },
  connecting: { label: "Realtime: connecting…", color: "bg-yellow-500", ping: true },
  disconnected: { label: "Realtime: disconnected", color: "bg-red-500", ping: false },
};

export function RealtimeStatusIndicator() {
  const status = useSocketStatus();
  const { label, color, ping } = statusConfig[status];

  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground" title={label}>
      <span className="relative flex size-1.5 shrink-0">
        {ping && (
          <span className={`absolute inset-0 animate-ping rounded-full opacity-75 ${color}`} />
        )}
        <span className={`relative size-1.5 rounded-full ${color}`} />
      </span>
      <span>Realtime</span>
    </span>
  );
}
