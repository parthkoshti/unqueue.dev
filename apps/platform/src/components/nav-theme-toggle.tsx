import { MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useSocketStatus } from "@/hooks/use-socket-status";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const socketStatusConfig = {
  connected: { color: "bg-green-500", ping: true, label: "Realtime: connected" },
  connecting: { color: "bg-yellow-500", ping: true, label: "Realtime: connecting…" },
  disconnected: { color: "bg-red-500", ping: false, label: "Realtime: disconnected" },
};

export function NavThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const socketStatus = useSocketStatus();
  const isDark = theme === "dark";
  const { color, ping } = socketStatusConfig[socketStatus];

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={isDark ? "Light mode" : "Dark mode"}
          onClick={toggleTheme}
          className="overflow-visible"
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
          <span className="flex-1 truncate">
            {isDark ? "Light mode" : "Dark mode"}
          </span>
          <span className="relative flex size-2 shrink-0 overflow-visible group-data-[collapsible=icon]:hidden">
            {ping && (
              <span
                className={`absolute inset-0 animate-ping rounded-full opacity-75 ${color}`}
              />
            )}
            <span className={`relative size-2 rounded-full ${color}`} />
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
