const pains = [
  {
    before: "A user emails you. That's how you find out a job failed.",
    after: "Know the instant it happens — error, stack trace, and the exact input that caused it. Before anyone else notices.",
  },
  {
    before: "Debugging a stuck queue means redis-cli LLEN, ZRANGE, HGETALL. Copy-pasting job IDs. Every time.",
    after: "Click any job. Input, output, logs, and failure reason — all in one place. No terminal. No copy-pasting.",
  },
  {
    before: "Slow throughput. Is it the worker? Redis? Just high load? You genuinely don't know.",
    after: "Processing rate and failure rate over a rolling window. See exactly what changed and when.",
  },
];

export function ProblemSection() {
  return (
    <section className="border-y border-border/50 py-20">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <p className="mb-12 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          If you run BullMQ in production, you've hit these.
        </p>

        <div className="grid gap-px border border-border bg-border sm:grid-cols-3">
          {pains.map((pain) => (
            <div key={pain.before} className="flex flex-col gap-0 bg-background">
              <div className="flex flex-1 flex-col gap-3 p-5 pb-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-red-400/80" />
                    before
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">{pain.before}</p>
              </div>
              <div className="border-t border-border/60 bg-card/40 flex flex-col gap-3 p-5 pt-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    <span className="size-1.5 rounded-full bg-success" />
                    after
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-foreground/80">{pain.after}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
