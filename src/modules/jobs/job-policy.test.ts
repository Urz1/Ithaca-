import { describe, expect, it } from "vitest";
import {
  calculateRetryDelay,
  canRetry,
  createIdempotencyKey,
  JOB_TYPES,
} from "./job-policy";

describe("job policy", () => {
  it("applies bounded exponential backoff with jitter", () => {
    expect(calculateRetryDelay(1, undefined, () => 0)).toBe(500);
    expect(calculateRetryDelay(3, undefined, () => 1)).toBe(4_000);
    expect(calculateRetryDelay(20, undefined, () => 1)).toBe(60_000);
  });

  it("stops retrying after the configured attempt budget", () => {
    expect(canRetry(4)).toBe(true);
    expect(canRetry(5)).toBe(false);
  });

  it("creates tenant-scoped idempotency keys", () => {
    expect(
      createIdempotencyKey(
        "org-1",
        JOB_TYPES.citationClassification,
        "paper-a:paper-b",
      ),
    ).toBe("org-1:citation_classification:paper-a:paper-b");
  });
});
