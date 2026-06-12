import { ArrowRightIcon } from "lucide-react";
import { env } from "@/lib/env";

export function CtaSection() {
  return (
    <section className="border-t border-border/50 bg-card/30 py-24">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <h2 className="mb-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Stop debugging queues blind.
        </h2>
        <p className="mb-2 text-base text-muted-foreground">
          Paste your Redis URL and see live queue data in under 60 seconds.
        </p>
        <p className="mb-8 text-sm text-muted-foreground/60">
          Free to start. No card required. Works with every Redis provider.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href={env.links.signup}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Connect your Redis
            <ArrowRightIcon className="size-3.5" />
          </a>
          <a
            href="https://github.com/unqueue/unqueue"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            or self-host instead →
          </a>
        </div>
      </div>
    </section>
  );
}
