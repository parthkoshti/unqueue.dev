import { describe, expect, it } from "vitest";
import { diffQueues } from "./discovery.js";

describe("diffQueues", () => {
  it("detects added and removed queues", () => {
    const result = diffQueues(["a", "b"], ["b", "c"]);
    expect(result.added).toEqual(["c"]);
    expect(result.removed).toEqual(["a"]);
  });
});
