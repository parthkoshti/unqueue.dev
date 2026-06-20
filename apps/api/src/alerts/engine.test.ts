import { describe, expect, it } from "vitest";
import { evaluateCondition } from "./conditions.js";

describe("evaluateCondition", () => {
  const metrics = {
    failureRate: 0.2,
    queueLagMs: 5000,
    waiting: 100,
    stalledCount: 2,
  };

  it("evaluates failure_rate", () => {
    expect(
      evaluateCondition(
        { type: "failure_rate", threshold: 0.15, windowMinutes: 5 },
        metrics,
      ),
    ).toBe(true);
  });

  it("evaluates waiting_jobs", () => {
    expect(
      evaluateCondition({ type: "waiting_jobs", threshold: 50 }, metrics),
    ).toBe(true);
  });

  it("evaluates stalled", () => {
    expect(
      evaluateCondition({ type: "stalled", minStalledJobs: 1 }, metrics),
    ).toBe(true);
  });

  it("evaluates queue_lag", () => {
    expect(
      evaluateCondition({ type: "queue_lag", maxLagMs: 1000 }, metrics),
    ).toBe(true);
  });
});
