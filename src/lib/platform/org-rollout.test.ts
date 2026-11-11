import { describe, expect, it } from "vitest";
import { isFeatureEnabledForOrganization } from "./org-rollout";

describe("org-rollout", () => {
  it("falls back to global feature defaults without organization context", async () => {
    await expect(
      isFeatureEnabledForOrganization("ai-chat", null),
    ).resolves.toBe(true);
  });
});
