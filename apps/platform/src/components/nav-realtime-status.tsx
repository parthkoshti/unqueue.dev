import { useSocketStatus } from "@/hooks/use-socket-status";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const statusConfig = {
  connected: {
    tooltip: "Realtime: connected",
    color: "bg-green-500",
    ping: true,
  },
  connecting: {
    tooltip: "Realtime: connecting…",
    color: "bg-yellow-500",
    ping: true,
  },
  disconnected: {
    tooltip: "Realtime: disconnected",
    color: "bg-red-500",
    ping: false,
  },
};

export function NavRealtimeStatus() {
  const status = useSocketStatus();
  const { tooltip, color, ping } = statusConfig[status];

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={tooltip}
          className="pointer-events-none cursor-default"
        >
          <span className="relative flex size-4 items-center justify-center shrink-0">
            {ping && (
              <span
                className={`absolute inline-flex size-full animate-ping rounded-full opacity-75 ${color}`}
              />
            )}
            <span className={`relative inline-flex size-2.5 rounded-full ${color}`} />
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
