/**
 * Logo options for unqueue — preview at /logo-preview
 * Three directions: queue lines, lettermark, flow bracket
 */

// ─── Option 1: Queue Lines ────────────────────────────────────────────────────
// Three horizontal bars representing a queue being processed (top bar exits right)
export function LogoQueueLines({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Top bar — partially exiting, faded */}
      <rect x="4" y="7" width="14" height="3" rx="1.5" fill="currentColor" opacity="0.25" />
      <rect x="20" y="7" width="8" height="3" rx="1.5" fill="currentColor" opacity="0.5" />
      {/* Middle bar — full, active */}
      <rect x="4" y="14.5" width="24" height="3" rx="1.5" fill="currentColor" />
      {/* Bottom bar — waiting */}
      <rect x="4" y="22" width="18" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export function LogoQueueLinesIcon({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-lg bg-primary text-primary-foreground"
    >
      <LogoQueueLines size={Math.round(size * 0.65)} />
    </div>
  );
}

// ─── Option 2: Pulse Monitor ─────────────────────────────────────────────────
// A square grid of dots with one "active" — suggests job-level monitoring
export function LogoPulseMonitor({ size = 32 }: { size?: number }) {
  const dots = [
    // row 1
    { cx: 9,  cy: 9,  opacity: 0.25 },
    { cx: 16, cy: 9,  opacity: 0.25 },
    { cx: 23, cy: 9,  opacity: 0.5  },
    // row 2
    { cx: 9,  cy: 16, opacity: 0.5  },
    { cx: 16, cy: 16, opacity: 1    }, // active center
    { cx: 23, cy: 16, opacity: 0.5  },
    // row 3
    { cx: 9,  cy: 23, opacity: 0.25 },
    { cx: 16, cy: 23, opacity: 0.5  },
    { cx: 23, cy: 23, opacity: 0.25 },
  ];

  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {dots.map((d, i) => (
        <circle key={i} cx={d.cx} cy={d.cy} r="2.5" fill="currentColor" opacity={d.opacity} />
      ))}
    </svg>
  );
}

export function LogoPulseMonitorIcon({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-lg bg-primary text-primary-foreground"
    >
      <LogoPulseMonitor size={Math.round(size * 0.72)} />
    </div>
  );
}

// ─── Option 3: Dequeue Arrow ──────────────────────────────────────────────────
// A bracket [ with an arrow flowing out — queue in, processed out
export function LogoDequeueArrow({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Left bracket */}
      <path
        d="M13 7 L8 7 L8 25 L13 25"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />
      {/* Arrow pointing right — the dequeue */}
      <path
        d="M14 16 L24 16"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M20 11.5 L24.5 16 L20 20.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LogoDequeueArrowIcon({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center rounded-lg bg-primary text-primary-foreground"
    >
      <LogoDequeueArrow size={Math.round(size * 0.72)} />
    </div>
  );
}
