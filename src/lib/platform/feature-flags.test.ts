import { describe, expect, it } from "vitest";
import { FEATURE_FLAGS, isFeatureEnabled } from "@/lib/platform/feature-flags";

describe("isFeatureEnabled", () => {
  it("uses safe defaults", () => {
    expect(isFeatureEnabled(FEATURE_FLAGS.aiClassification, {})).toBe(true);
    expect(isFeatureEnabled(FEATURE_FLAGS.publicSharing, {})).toBe(false);
  });

  it("accepts explicit boolean-like environment overrides", () => {
    expect(
      isFeatureEnabled(FEATURE_FLAGS.durableJobs, {
        FEATURE_DURABLE_JOBS: "true",
      }),
    ).toBe(true);
    expect(
      isFeatureEnabled(FEATURE_FLAGS.aiChat, { FEATURE_AI_CHAT: "0" }),
    ).toBe(false);
  });
});
