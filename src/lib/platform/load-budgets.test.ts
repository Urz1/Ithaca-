import { describe, expect, it } from "vitest";
import { LOAD_BUDGETS } from "./load-budgets";
import { PLATFORM_LIMITS } from "./limits";

describe("load budgets", () => {
  it("aligns interactive graph limits with export thresholds", () => {
    expect(PLATFORM_LIMITS.exports.maxNodesSynchronous).toBeLessThan(
      PLATFORM_LIMITS.graph.maxNodesInteractive,
    );
  });

  it("defines release-gate thresholds for public and API traffic", () => {
    expect(LOAD_BUDGETS.api.errorRateMax).toBeLessThanOrEqual(
      LOAD_BUDGETS.public.errorRateMax,
    );
    expect(LOAD_BUDGETS.api.latencyP95Ms).toBeLessThan(
      LOAD_BUDGETS.classify.latencyP95Ms,
    );
  });
});
