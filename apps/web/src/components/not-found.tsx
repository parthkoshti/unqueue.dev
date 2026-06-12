import { Link } from "@tanstack/react-router";
import { ArrowLeftIcon } from "lucide-react";

export function NotFound() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden px-4">
      {/* Background grid */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--grid-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-color)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]"
      />

      <div className="relative text-center">
        <p className="mb-6 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          404
        </p>
        <h1 className="mb-4 font-mono text-6xl font-bold tabular-nums text-foreground sm:text-8xl">
          Not found.
        </h1>
        <p className="mb-10 text-base text-muted-foreground">
          This page doesn't exist or may have moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to home
        </Link>
      </div>
    </div>
  );
}
