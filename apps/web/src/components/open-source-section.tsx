import { GithubIcon } from "lucide-react";

export function OpenSourceSection() {
  return (
    <section className="border-t border-border/50 py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <h2 className="mb-3 text-xl font-semibold tracking-tight text-foreground">
              Open source. Self-hostable.
              <br />
              Read the code.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              unqueue is AGPL-3.0 licensed. Run it yourself on Docker Compose —
              the self-hosted version is the same software as the hosted
              version. No feature tiers, no paywalls on the core functionality.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:items-end">
            <a
              href="https://github.com/parthkoshti/unqueue.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              <GithubIcon className="size-4" />
              GitHub ↗
            </a>
            <p className="text-xs text-muted-foreground">
              AGPL-3.0 · Docker Compose deploy
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
