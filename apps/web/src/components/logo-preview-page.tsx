import {
  LogoQueueLinesIcon,
  LogoQueueLines,
  LogoPulseMonitorIcon,
  LogoPulseMonitor,
  LogoDequeueArrowIcon,
  LogoDequeueArrow,
} from "@/components/logo-options";

const options = [
  {
    name: "Option 1 — Queue Lines",
    description:
      "Three horizontal bars at varying opacity suggest a queue being processed. The top bar exits right.",
    Icon: LogoQueueLinesIcon,
    Mark: LogoQueueLines,
  },
  {
    name: "Option 2 — Pulse Monitor",
    description:
      "A 3×3 dot grid with a bright center dot — communicates job-level monitoring and observability.",
    Icon: LogoPulseMonitorIcon,
    Mark: LogoPulseMonitor,
  },
  {
    name: "Option 3 — Dequeue Arrow",
    description:
      "A left bracket [ with an arrow flowing out — a literal dequeue operation. Technical and direct.",
    Icon: LogoDequeueArrowIcon,
    Mark: LogoDequeueArrow,
  },
];

export function LogoPreviewPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 pb-32 pt-32 sm:px-6">
      <div className="mb-16">
        <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Logo options
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">unqueue</h1>
      </div>

      <div className="space-y-12">
        {options.map((opt) => (
          <div key={opt.name} className="rounded-2xl border border-border bg-card p-8">
            <p className="mb-1 font-mono text-xs text-muted-foreground">{opt.name}</p>
            <p className="mb-8 text-sm text-muted-foreground/70">{opt.description}</p>

            <div className="mb-8 flex flex-wrap items-end gap-6">
              {[16, 24, 32, 48, 64, 96].map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <opt.Icon size={s} />
                  <span className="font-mono text-xs text-muted-foreground/50">{s}</span>
                </div>
              ))}
            </div>

            <div className="mb-8 flex flex-wrap items-center gap-8 rounded-xl border border-border bg-background p-6">
              {[24, 32, 48].map((s) => (
                <div key={s} className="flex items-center gap-2.5">
                  <opt.Icon size={s} />
                  <span
                    className="font-mono font-semibold text-foreground"
                    style={{ fontSize: s * 0.44 }}
                  >
                    unqueue
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-6 rounded-xl bg-white p-6">
              {[24, 32, 48].map((s) => (
                <div key={s} className="flex items-center gap-2.5">
                  <opt.Icon size={s} />
                  <span
                    className="font-mono font-semibold text-gray-900"
                    style={{ fontSize: s * 0.44 }}
                  >
                    unqueue
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
