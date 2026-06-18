import { GithubIcon } from "lucide-react";

const objections = [
  {
    question: "My job payloads contain sensitive data.",
    answer:
      "unqueue never stores your job data. Every request reads directly from your Redis instance on demand — nothing is persisted, cached, or transmitted elsewhere. If that's not enough, self-host with a single docker compose up. You control the infrastructure.",
    action: {
      label: "Self-host docs →",
      href: "https://github.com/parthkoshti/unqueue.dev#docker--dokploy",
    },
  },
  {
    question: "What if you shut down or start charging?",
    answer:
      "AGPL-3.0. Every line of code is on GitHub — fork it, run it, own it. The self-hosted version is identical to the cloud version, no features gated. You're never locked in.",
    action: {
      label: "View source →",
      href: "https://github.com/parthkoshti/unqueue.dev",
    },
  },
  {
    question: "We already have Datadog and Grafana.",
    answer:
      "Those solve infrastructure observability. unqueue solves job observability — a different layer entirely. Datadog can tell you a worker process crashed. It can't tell you which job caused it, what the input was, or what your worker logged before it failed. Unless you've already built structured logging that correlates job IDs to failure state, you don't actually have that coverage.",
    action: null,
  },
];

export function ObjectionsSection() {
  return (
    <section className="border-t border-border/50 py-24">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-14">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            The questions you're probably asking.
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {objections.map((o) => (
            <div key={o.question} className="flex flex-col gap-3">
              <h3 className="text-base font-semibold leading-snug text-foreground">
                "{o.question}"
              </h3>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                {o.answer}
              </p>
              {o.action && (
                <a
                  href={o.action.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  {o.action.label}
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Open source strip */}
        <div className="mt-16 flex flex-col gap-4 rounded-2xl border border-border bg-card/50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">
              Open source. No black boxes.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              AGPL-3.0 · React + Hono · Docker Compose deploy · Self-hosted =
              same software
            </p>
          </div>
          <a
            href="https://github.com/parthkoshti/unqueue.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <GithubIcon className="size-4" />
            GitHub
          </a>
        </div>
      </div>
    </section>
  );
}
