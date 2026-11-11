import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ auth: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { evaluateRateLimit } from "./api-auth";

describe("evaluateRateLimit", () => {
  const now = new Date("2026-07-24T12:00:00.000Z");

  it("starts a window when no record exists", () => {
    expect(evaluateRateLimit(null, 20, now)).toEqual({ action: "reset" });
  });

  it("resets an expired window", () => {
    const record = {
      count: 100,
      windowStart: new Date(now.getTime() - 60_001),
    };

    expect(evaluateRateLimit(record, 20, now)).toEqual({ action: "reset" });
  });

  it("increments an active window below its limit", () => {
    const record = {
      count: 19,
      windowStart: new Date(now.getTime() - 30_000),
    };

    expect(evaluateRateLimit(record, 20, now)).toEqual({
      action: "increment",
    });
  });

  it("rejects an active window at its limit with a rounded retry time", () => {
    const record = {
      count: 20,
      windowStart: new Date(now.getTime() - 48_500),
    };

    expect(evaluateRateLimit(record, 20, now)).toEqual({
      action: "reject",
      retryAfterSeconds: 12,
    });
  });
});
