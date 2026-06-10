import { SearchIcon } from "lucide-react";
import { useShell } from "@/components/shell-context";
import { cn } from "@/lib/utils";

export function NavSearch({ className }: { className?: string }) {
  const { openCommandPalette } = useShell();

  return (
    <button
      type="button"
      onClick={openCommandPalette}
      className={cn(
        "inline-flex h-7 w-full max-w-56 items-center gap-2 rounded-md border border-input bg-muted/40 px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
        className,
      )}
    >
      <SearchIcon className="size-3.5 shrink-0" />
      <span className="flex-1 truncate text-left">Search...</span>
      <kbd className="pointer-events-none hidden h-5 shrink-0 select-none items-center gap-0.5 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:inline-flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </button>
  );
}
