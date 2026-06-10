import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils.js";

const badgeVariants = cva(
  "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary)]/15 text-[var(--color-primary)]",
        secondary: "bg-[var(--color-secondary)] text-[var(--color-secondary-foreground)]",
        success: "bg-[var(--color-success)]/15 text-[var(--color-success)]",
        warning: "bg-[var(--color-warning)]/15 text-[var(--color-warning)]",
        destructive: "bg-[var(--color-destructive)]/15 text-[var(--color-destructive)]",
        outline: "border border-[var(--color-border)] text-[var(--color-muted-foreground)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
