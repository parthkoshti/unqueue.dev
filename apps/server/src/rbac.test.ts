import { describe, expect, it } from "vitest";
import { hasMinimumRole } from "@unstall/shared";

describe("RBAC", () => {
  it("owner has admin access", () => {
    expect(hasMinimumRole("owner", "admin")).toBe(true);
  });

  it("viewer cannot perform member actions", () => {
    expect(hasMinimumRole("viewer", "member")).toBe(false);
  });

  it("admin has member access", () => {
    expect(hasMinimumRole("admin", "member")).toBe(true);
  });
});
