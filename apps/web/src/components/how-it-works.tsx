const steps = [
  {
    n: "01",
    title: "Paste your Redis URL",
    body: "TLS and ACL users supported out of the box. Works with every major managed provider. Add a dedicated read-only ACL user for monitoring, or write access if you want admin actions.",
    code: "rediss://unqueue-read:password@your-redis.host:6380/0",
  },
  {
    n: "02",
    title: "Queues appear automatically",
    body: "unqueue scans your Redis keyspace using BullMQ's key schema. No queue registration, no manifest file. New queues appear the moment workers create them.",
    code: "Discovered: email-queue, image-processing, notifications",
  },
  {
    n: "03",
    title: "Watch jobs in real time",
    body: "Live updates stream via BullMQ's QueueEvents — the same event system your workers already use. Click any job to see its input, output, logs, and failure details.",
    code: null,
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="relative overflow-hidden border-t border-border/50 py-24">
      {/* background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_100%,oklch(0.62_0.19_250/0.07),transparent)]"
      />

      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-16">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            How it works
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Live data in under 60 seconds.
          </h2>
          <p className="mt-2 text-base text-muted-foreground">
            No agents. No code changes. No instrumentation.
          </p>
        </div>

        <div className="relative">
          {/* connector line */}
          <div className="absolute left-[1.1rem] top-6 hidden h-[calc(100%-3rem)] w-px bg-gradient-to-b from-primary/40 via-primary/20 to-transparent sm:block" />

          <div className="flex flex-col gap-10">
            {steps.map((step, i) => (
              <div key={step.n} className="flex gap-6">
                <div className="relative flex-none">
                  <div className="flex size-9 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-bold tabular-nums text-primary ring-4 ring-primary/5">
                    {step.n}
                  </div>
                </div>
                <div className="min-w-0 pb-2 pt-1.5">
                  <h3 className="mb-1.5 font-semibold tracking-tight text-foreground">
                    {step.title}
                  </h3>
                  <p className="mb-3 text-sm leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                  {step.code && (
                    <div className="inline-block rounded-md border border-primary/15 bg-primary/5 px-3 py-2">
                      <p className="font-mono text-xs text-primary/70 break-all">{step.code}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
