import { describe, expect, it } from "vitest";
import { enforceMaximum } from "@/lib/platform/limits";

describe("platform limits", () => {
  it("allows values at the configured maximum", () => {
    expect(enforceMaximum(100, 100, "Graph")).toEqual({ allowed: true });
  });

  it("returns a stable error contract above the maximum", () => {
    expect(enforceMaximum(101, 100, "Graph")).toEqual({
      allowed: false,
      code: "LIMIT_EXCEEDED",
      message: "Graph exceeds the supported maximum of 100.",
    });
  });
});
