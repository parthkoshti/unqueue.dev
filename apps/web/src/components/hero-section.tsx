import { ArrowRightIcon, GithubIcon } from "lucide-react";
import { env } from "@/lib/env";

const PROVIDERS = [
  "Redis Cloud",
  "Upstash",
  "ElastiCache",
  "Aiven",
  "Azure Cache",
  "Self-hosted",
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-20 pt-28 sm:pt-36">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--grid-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-color)_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,oklch(0.62_0.19_250/0.12),transparent)]"
      />

      <div className="relative mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            No agents. No code changes. No stored data.
          </div>

          <h1 className="mb-5 text-balance text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl lg:leading-[1.05]">
            BullMQ monitoring
            <br />
            <span className="text-primary">that just works.</span>
          </h1>

          <p className="mx-auto mb-8 max-w-lg text-balance text-lg leading-relaxed text-muted-foreground">
            Paste your Redis URL. See every queue, job, failure, and worker log — live. Under 60 seconds, nothing to install.
          </p>

          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <a
              href={env.links.signup}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Connect your Redis
              <ArrowRightIcon className="size-3.5" />
            </a>
            <a
              href="https://github.com/unqueue/unqueue"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-6 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-border/80 hover:text-foreground"
            >
              <GithubIcon className="size-3.5" />
              Self-host free
            </a>
          </div>

          <p className="mt-5 text-xs text-muted-foreground/50">
            Free to start · No card required · Works with Redis Cloud, Upstash, ElastiCache, Aiven & more
          </p>
        </div>

        {/* Dashboard preview */}
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center gap-1.5 border-b border-border/60 bg-background/40 px-4 py-3">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="ml-3 font-mono text-xs text-muted-foreground">
              app.unqueue.dev
            </span>
            <span className="ml-auto flex items-center gap-1.5 text-xs text-success">
              <span className="size-1.5 rounded-full bg-success" />
              live
            </span>
          </div>
          <DashboardPreview />
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  const queues = [
    { name: "email-queue",      active: 3,  waiting: 12, failed: 2, status: "running" },
    { name: "image-processing", active: 8,  waiting: 34, failed: 7, status: "running" },
    { name: "notifications",    active: 1,  waiting: 0,  failed: 0, status: "idle"    },
    { name: "data-export",      active: 0,  waiting: 5,  failed: 1, status: "paused"  },
  ];

  return (
    <div className="grid divide-x divide-border md:grid-cols-[1fr_300px]">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">4 queues · my-redis</span>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 border-b border-border bg-background/30 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>Queue</span>
            <span>Active</span>
            <span>Waiting</span>
            <span>Failed</span>
            <span>Status</span>
          </div>
          {queues.map((q) => (
            <div
              key={q.name}
              className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 border-b border-border/40 px-3 py-2.5 text-xs last:border-b-0"
            >
              <span className="font-mono text-foreground">{q.name}</span>
              <span className="tabular-nums text-primary">{q.active}</span>
              <span className="tabular-nums text-muted-foreground">{q.waiting}</span>
              <span className={`tabular-nums ${q.failed > 0 ? "text-red-400" : "text-muted-foreground"}`}>{q.failed}</span>
              <span className={`text-xs ${q.status === "running" ? "text-success" : q.status === "paused" ? "text-warning" : "text-muted-foreground"}`}>{q.status}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden p-4 md:block">
        <div className="mb-3 text-xs font-medium text-muted-foreground">job #18204 · image-processing</div>
        <div className="space-y-3">
          <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2">
            <div className="mb-1 text-xs font-medium text-red-400">Failed</div>
            <div className="font-mono text-xs leading-relaxed text-muted-foreground">
              Error: Sharp conversion failed<br />
              at processImage (worker.ts:84)<br />
              at Worker.process (worker.ts:41)
            </div>
          </div>
          <div className="rounded-md border border-border bg-background/30 px-3 py-2">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">Input</div>
            <div className="font-mono text-xs leading-relaxed text-foreground/70">
              {"{"}<br />
              &nbsp;&nbsp;<span className="text-primary/70">"fileId"</span>: <span className="text-success/80">"img_9f3a"</span>,<br />
              &nbsp;&nbsp;<span className="text-primary/70">"format"</span>: <span className="text-success/80">"webp"</span><br />
              {"}"}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 rounded-md bg-primary/15 py-1.5 text-center text-xs font-medium text-primary">Retry</button>
            <button className="flex-1 rounded-md border border-border py-1.5 text-center text-xs font-medium text-muted-foreground">Remove</button>
          </div>
        </div>
      </div>
    </div>
  );
}
