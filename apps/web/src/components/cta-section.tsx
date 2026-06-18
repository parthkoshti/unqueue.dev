import { ArrowRightIcon } from "lucide-react";

export function CtaSection() {
  return (
    <section className="border-t border-border/50 bg-card/30 py-24">
      <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
        <h2 className="mb-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Stop debugging queues blind.
        </h2>
        <p className="mb-2 text-base text-muted-foreground">
          Self-host unqueue for free today, or join the hosted waitlist.
        </p>
        <p className="mb-8 text-sm text-muted-foreground/60">
          Hosted does not exist yet. The open-source version is available now.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <a
            href="/#waitlist"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Join hosted waitlist
            <ArrowRightIcon className="size-3.5" />
          </a>
          <a
            href="https://github.com/parthkoshti/unqueue.dev"
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
