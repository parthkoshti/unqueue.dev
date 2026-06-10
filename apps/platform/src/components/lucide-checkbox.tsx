import { Square, SquareCheck, SquareMinus } from "lucide-react";
import { cn } from "@/lib/utils";

export function LucideCheckbox({
  checked,
  indeterminate = false,
  onCheckedChange,
  className,
  "aria-label": ariaLabel = "Select row",
}: {
  checked: boolean;
  indeterminate?: boolean;
  onCheckedChange: () => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
        (checked || indeterminate) && "text-primary hover:text-primary",
        className,
      )}
      onClick={(e) => {
        e.stopPropagation();
        onCheckedChange();
      }}
    >
      {indeterminate ? (
        <SquareMinus className="size-4" strokeWidth={2} />
      ) : checked ? (
        <SquareCheck className="size-4" strokeWidth={2} />
      ) : (
        <Square className="size-4" strokeWidth={2} />
      )}
    </button>
  );
}
