import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function RevealableInput({
  className,
  revealed: revealedProp,
  defaultRevealed = false,
  onRevealedChange,
  mask = "••••••••••••",
  value = "",
  onClick,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type"> & {
  revealed?: boolean;
  defaultRevealed?: boolean;
  onRevealedChange?: (revealed: boolean) => void;
  mask?: string;
}) {
  const [internalRevealed, setInternalRevealed] = useState(defaultRevealed);
  const revealed = revealedProp ?? internalRevealed;
  const hasValue = String(value).length > 0;

  const setRevealed = (next: boolean) => {
    if (revealedProp === undefined) {
      setInternalRevealed(next);
    }
    onRevealedChange?.(next);
  };

  return (
    <div className="relative" onClick={onClick}>
      <Input
        {...props}
        value={revealed ? value : hasValue ? mask : value}
        readOnly={!revealed || props.readOnly}
        className={cn("pr-8", className)}
      />
      <button
        type="button"
        tabIndex={-1}
        aria-label={revealed ? "Hide host" : "Reveal host"}
        className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          setRevealed(!revealed);
        }}
      >
        {revealed ? (
          <EyeOffIcon className="size-3.5" />
        ) : (
          <EyeIcon className="size-3.5" />
        )}
      </button>
    </div>
  );
}
