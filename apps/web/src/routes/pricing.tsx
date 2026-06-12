import { createFileRoute } from "@tanstack/react-router";
import { CheckIcon } from "lucide-react";
import { env } from "@/lib/env";
import { usePageMeta } from "@/lib/page-meta";

export const Route = createFileRoute("/pricing")({
  component: PricingPage,
});

const tiers = [
  {
    name: "Starter",
    price: 5,
    description: "For solo engineers monitoring a single project.",
    projects: 1,
    queues: "10",
    highlight: false,
    features: [
      "1 Redis connection",
      "Up to 10 queues",
      "Real-time job monitoring",
      "Job inspection — input, output, logs",
      "Admin actions — retry, pause, drain",
      "Discord alerts",
      "BullMQ v3 + v4 support",
    ],
    cta: "Get started",
    ctaHref: env.links.signup,
  },
  {
    name: "Pro",
    price: 20,
    description: "For teams running multiple services or environments.",
    projects: 3,
    queues: "50",
    highlight: true,
    features: [
      "3 Redis connections",
      "Up to 50 queues",
      "Real-time job monitoring",
      "Job inspection — input, output, logs",
      "Admin actions — retry, pause, drain",
      "Discord alerts",
      "BullMQ v3 + v4 support",
      "Multiple environments (prod, staging, dev)",
    ],
    cta: "Get started",
    ctaHref: env.links.signup,
  },
  {
    name: "Scale",
    price: 100,
    description: "For larger teams with serious queue infrastructure.",
    projects: 10,
    queues: "∞",
    highlight: false,
    features: [
      "10 Redis connections",
      "Unlimited queues (fair use)",
      "Real-time job monitoring",
      "Job inspection — input, output, logs",
      "Admin actions — retry, pause, drain",
      "Discord alerts",
      "BullMQ v3 + v4 support",
      "Multiple environments",
      "Priority support",
    ],
    cta: "Get started",
    ctaHref: env.links.signup,
  },
];

const faqs = [
  {
    q: "What counts as a project?",
    a: "A project is one Redis connection. If you have separate Redis instances for production and staging, that's two projects.",
  },
  {
    q: "What happens if I exceed the queue limit?",
    a: "unqueue will still connect and show your queues — you just won't be able to add more than the limit allows per connection. Existing queues always stay visible.",
  },
  {
    q: "Can I self-host instead?",
    a: "Yes. unqueue is AGPL-3.0 licensed. The self-hosted version is identical to the cloud version — no features held back. See the GitHub repo for Docker Compose setup.",
  },
  {
    q: "Is there a free trial?",
    a: "You can connect your first Redis instance and explore the dashboard before entering a card. No time limit on the trial.",
  },
  {
    q: "What does 'fair use' mean for unlimited queues?",
    a: "We don't set a hard cap, but we reserve the right to reach out if usage is significantly outside normal patterns for the Scale tier. In practice this never affects normal engineering teams.",
  },
];

function PricingPage() {
  usePageMeta({
    title: "Pricing — unqueue",
    description: "Simple per-project pricing. Start for $5/mo. No agents, no instrumentation, no surprises.",
  });

  return (
    <div className="relative overflow-hidden">
      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,oklch(0.62_0.19_250/0.1),transparent)]"
      />

      <div className="relative mx-auto max-w-5xl px-4 pb-32 pt-32 sm:px-6">
        {/* Header */}
        <div className="mb-16 text-center">
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            Pricing
          </p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Pay per project.
            <br />
            <span className="text-primary">Nothing hidden.</span>
          </h1>
          <p className="mx-auto max-w-md text-base text-muted-foreground">
            One flat monthly price per tier. No per-seat fees, no usage charges, no surprises.
          </p>
        </div>

        {/* Tiers */}
        <div className="mb-20 grid gap-4 sm:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                tier.highlight
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border bg-card"
              }`}
            >
              {tier.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full border border-primary/30 bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                    Most popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p className="mb-1 font-mono text-sm font-semibold text-foreground">
                  {tier.name}
                </p>
                <p className="mb-3 text-xs text-muted-foreground">{tier.description}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold tabular-nums tracking-tight text-foreground">
                    ${tier.price}
                  </span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </div>
              </div>

              {/* Limits */}
              <div className="mb-6 flex gap-3">
                <div className="flex-1 rounded-lg border border-border bg-background/50 px-3 py-2 text-center">
                  <p className="font-mono text-lg font-bold text-foreground">{tier.projects}</p>
                  <p className="text-xs text-muted-foreground">{tier.projects === 1 ? "project" : "projects"}</p>
                </div>
                <div className="flex-1 rounded-lg border border-border bg-background/50 px-3 py-2 text-center">
                  <p className="font-mono text-lg font-bold text-foreground">
                    {tier.queues}
                  </p>
                  <p className="text-xs text-muted-foreground">queues</p>
                </div>
              </div>

              {/* Features */}
              <ul className="mb-8 flex-1 space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <CheckIcon className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {f}
                  </li>
                ))}
              </ul>

              <a
                href={tier.ctaHref}
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 ${
                  tier.highlight
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-background text-foreground hover:bg-accent"
                }`}
              >
                {tier.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Self-host strip */}
        <div className="mb-20 flex flex-col gap-4 rounded-2xl border border-border bg-card/50 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-foreground">Prefer to self-host?</p>
            <p className="mt-1 text-sm text-muted-foreground">
              AGPL-3.0 licensed. Same software, your infrastructure. One <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">docker compose up</code> and you're running.
            </p>
          </div>
          <a
            href="https://github.com/unqueue/unqueue"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            View on GitHub →
          </a>
        </div>

        {/* FAQ */}
        <div>
          <h2 className="mb-10 text-xl font-bold tracking-tight text-foreground">
            Pricing questions.
          </h2>
          <div className="grid gap-8 sm:grid-cols-2">
            {faqs.map((faq) => (
              <div key={faq.q}>
                <p className="mb-2 text-sm font-semibold text-foreground">{faq.q}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
