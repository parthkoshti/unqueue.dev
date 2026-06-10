import { describe, expect, it } from "vitest";
import {
  createInMemoryDiscoveryCache,
  DISCOVERY_CACHE_TTL_SEC,
} from "./cache.js";

describe("createInMemoryDiscoveryCache", () => {
  it("returns null for missing keys", async () => {
    const cache = createInMemoryDiscoveryCache();
    await expect(cache.get("instance-1")).resolves.toBeNull();
  });

  it("stores and retrieves queue names", async () => {
    const cache = createInMemoryDiscoveryCache();
    await cache.set("instance-1", ["alpha", "beta"], DISCOVERY_CACHE_TTL_SEC);
    await expect(cache.get("instance-1")).resolves.toEqual(["alpha", "beta"]);
  });

  it("invalidates entries", async () => {
    const cache = createInMemoryDiscoveryCache();
    await cache.set("instance-1", ["alpha"], DISCOVERY_CACHE_TTL_SEC);
    await cache.invalidate("instance-1");
    await expect(cache.get("instance-1")).resolves.toBeNull();
  });

  it("expires entries after ttl", async () => {
    const cache = createInMemoryDiscoveryCache();
    await cache.set("instance-1", ["alpha"], 0);
    await new Promise((resolve) => setTimeout(resolve, 5));
    await expect(cache.get("instance-1")).resolves.toBeNull();
  });
});
