"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

const faqs = [
  {
    q: "Which BullMQ versions are supported?",
    a: "unqueue supports BullMQ v3 and v4. It reads BullMQ's Redis key schema directly, so as long as your workers use a supported version, no changes are needed on your end.",
  },
  {
    q: "What Redis permissions does unqueue need?",
    a: "Read-only access is enough for monitoring — browsing queues, inspecting jobs, and viewing logs. Write access is required only if you want admin actions like retrying jobs, pausing queues, or draining backlogs.",
  },
  {
    q: "Does unqueue add overhead to my Redis?",
    a: "Minimal. unqueue subscribes to BullMQ's QueueEvents channel (a single pub/sub connection) and issues read commands on demand when you open a job or queue. It does not poll continuously or scan keyspaces on a schedule.",
  },
  {
    q: "Can I connect multiple Redis instances?",
    a: "Yes. You can add as many Redis connections as you need — one per environment, region, or microservice. Each connection is managed separately and shows its own set of queues.",
  },
  {
    q: "Does it work with BullMQ Pro?",
    a: "Yes. BullMQ Pro uses the same underlying Redis schema for standard queue and job data. Pro-specific features like groups are displayed where applicable.",
  },
  {
    q: "What happens if my Redis goes down?",
    a: "unqueue will show the connection as offline and stop receiving live events. No data is lost — when the connection is restored, queue state is re-read from Redis and the dashboard updates automatically.",
  },
  {
    q: "Is there a limit on how many queues or jobs I can see?",
    a: "No artificial limits on queues. Job list views are paginated to keep things fast, but you can navigate freely across all jobs in any state.",
  },
  {
    q: "Does it work with custom key prefixes?",
    a: "Yes. unqueue lets you configure a custom key prefix per Redis connection, matching whatever prefix you pass to your BullMQ Queue constructor.",
  },
];

export function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="border-t border-border/50 py-24">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-14">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
            FAQ
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Common questions.
          </h2>
        </div>

        <div className="divide-y divide-border">
          {faqs.map((faq, i) => (
            <div key={i}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="flex w-full items-start justify-between gap-6 py-5 text-left"
              >
                <span className="text-sm font-medium text-foreground">
                  {faq.q}
                </span>
                <PlusIcon
                  className={`mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                    open === i ? "rotate-45" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-200 ${
                  open === i ? "mb-5 max-h-40" : "max-h-0"
                }`}
              >
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
