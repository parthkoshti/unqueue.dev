import { useEffect, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { ArrowRightIcon, GithubIcon } from "lucide-react";
import { env } from "@/lib/env";

type WaitlistValues = {
  email: string;
};

const WAITLIST_INPUT_ID = "hero-waitlist-email";
const ANCHOR_SCROLL_OFFSET = 96;

function scrollToWaitlist() {
  const target = document.getElementById("waitlist");
  if (!target) return;

  const top = target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({
    top: Math.max(top - ANCHOR_SCROLL_OFFSET, 0),
    behavior: "smooth",
  });
}

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-20 pt-28 sm:pt-36">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,var(--grid-color)_1px,transparent_1px),linear-gradient(to_bottom,var(--grid-color)_1px,transparent_1px)] bg-size-[3rem_3rem] mask-[radial-gradient(ellipse_80%_60%_at_50%_0%,black,transparent)]"
      />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <a
            href="https://github.com/parthkoshti/unqueue.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 font-mono text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/10"
          >
            <GithubIcon className="size-3.5" />
            Open source
          </a>

          <h1 className="mx-auto mb-5 max-w-5xl text-balance text-5xl font-bold leading-[0.98] tracking-tight text-foreground sm:text-6xl lg:text-6xl xl:text-7xl">
            BullMQ dashboard
            <br />
            <span className="text-primary">built for production workflows</span>
          </h1>

          <p className="mx-auto mb-8 max-w-xl text-balance text-lg leading-relaxed text-muted-foreground sm:text-xl">
            See failed jobs, queue backlogs, payloads, stack traces, and worker
            logs without adding agents or changing worker code.
          </p>

          <HostedWaitlistForm />
        </div>

        {/* Dashboard preview */}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="flex items-center gap-1.5 border-b border-border/60 bg-background/40 px-4 py-3">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="ml-3 font-mono text-xs text-muted-foreground">
              unqueue.dev
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

function HostedWaitlistForm() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (window.location.hash !== "#waitlist") return;

    requestAnimationFrame(() => {
      scrollToWaitlist();
      document
        .getElementById(WAITLIST_INPUT_ID)
        ?.focus({ preventScroll: true });
    });
  }, []);

  const form = useForm({
    defaultValues: {
      email: "",
    } as WaitlistValues,
    onSubmit: async ({ value }) => {
      const email = value.email.trim().toLowerCase();
      setFormError(null);

      const response = await fetch(`${env.apiUrl}/api/waitlist`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        setFormError(body?.error ?? "Could not join the waitlist right now.");
        return;
      }

      setSubmittedEmail(email);
    },
  });

  if (submittedEmail) {
    return (
      <div
        id="waitlist"
        className="mx-auto max-w-xl scroll-mt-24 rounded-lg border border-primary/20 bg-card p-4 text-left"
      >
        <p className="text-sm font-medium text-foreground">
          You are on the hosted waitlist.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          We recorded {submittedEmail} and will reach out when hosted unqueue is
          ready.
        </p>
      </div>
    );
  }

  return (
    <form
      id="waitlist"
      className="mx-auto max-w-2xl scroll-mt-24 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        void form.handleSubmit();
      }}
      noValidate
    >
      <div className="grid gap-2 bg-transparent p-0 sm:grid-cols-[1fr_auto_auto]">
        <form.Field
          name="email"
          validators={{
            onChange: ({ value }) => {
              const trimmed = value.trim();
              if (!trimmed) return "Email is required";
              if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
                return "Enter a valid email";
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <div>
              <label className="sr-only" htmlFor="hero-waitlist-email">
                Work email
              </label>
              <input
                id={WAITLIST_INPUT_ID}
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                aria-invalid={!!field.state.meta.errors.length}
                disabled={form.state.isSubmitting}
                className="h-12 w-full rounded-lg border border-transparent bg-background px-4 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-primary"
              />
              <FieldError message={field.state.meta.errors[0]} />
            </div>
          )}
        </form.Field>

        <button
          type="submit"
          disabled={form.state.isSubmitting}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 font-mono text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {form.state.isSubmitting ? "Joining..." : "Join waitlist"}
          <ArrowRightIcon className="size-3.5" />
        </button>
        <a
          href="/docs/introduction"
          className="inline-flex h-12 items-center justify-center rounded-lg border border-border px-5 font-mono text-sm font-semibold text-foreground transition-colors hover:border-foreground/40"
        >
          Self host
        </a>
      </div>

      {formError && (
        <p className="mt-2 text-center text-xs text-red-400">{formError}</p>
      )}

      <p className="mt-3 text-center text-xs text-muted-foreground/60">
        Hosted waitlist. Self-host from the docs today.
      </p>
    </form>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;

  return <p className="mt-1 text-xs text-red-400">{message}</p>;
}

function DashboardPreview() {
  const queues = [
    {
      name: "email-queue",
      active: 3,
      waiting: 12,
      failed: 2,
      status: "running",
    },
    {
      name: "image-processing",
      active: 8,
      waiting: 34,
      failed: 7,
      status: "running",
    },
    { name: "notifications", active: 1, waiting: 0, failed: 0, status: "idle" },
    { name: "data-export", active: 0, waiting: 5, failed: 1, status: "paused" },
  ];

  return (
    <div className="grid divide-x divide-border md:grid-cols-[1fr_300px]">
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            4 queues · my-redis
          </span>
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
              <span className="tabular-nums text-muted-foreground">
                {q.waiting}
              </span>
              <span
                className={`tabular-nums ${q.failed > 0 ? "text-red-400" : "text-muted-foreground"}`}
              >
                {q.failed}
              </span>
              <span
                className={`text-xs ${q.status === "running" ? "text-success" : q.status === "paused" ? "text-warning" : "text-muted-foreground"}`}
              >
                {q.status}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="hidden p-4 md:block">
        <div className="mb-3 text-xs font-medium text-muted-foreground">
          job #18204 · image-processing
        </div>
        <div className="space-y-3">
          <div className="rounded-md border border-red-500/20 bg-red-500/5 px-3 py-2">
            <div className="mb-1 text-xs font-medium text-red-400">Failed</div>
            <div className="font-mono text-xs leading-relaxed text-muted-foreground">
              Error: Sharp conversion failed
              <br />
              at processImage (worker.ts:84)
              <br />
              at Worker.process (worker.ts:41)
            </div>
          </div>
          <div className="rounded-md border border-border bg-background/30 px-3 py-2">
            <div className="mb-1.5 text-xs font-medium text-muted-foreground">
              Input
            </div>
            <div className="font-mono text-xs leading-relaxed text-foreground/70">
              {"{"}
              <br />
              &nbsp;&nbsp;<span className="text-primary/70">
                "fileId"
              </span>: <span className="text-success/80">"img_9f3a"</span>,
              <br />
              &nbsp;&nbsp;<span className="text-primary/70">
                "format"
              </span>: <span className="text-success/80">"webp"</span>
              <br />
              {"}"}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="flex-1 rounded-md bg-primary/15 py-1.5 text-center text-xs font-medium text-primary">
              Retry
            </button>
            <button className="flex-1 rounded-md border border-border py-1.5 text-center text-xs font-medium text-muted-foreground">
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
