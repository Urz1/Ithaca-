import { describe, expect, it, vi, beforeEach } from "vitest";
import { assertAiBudgetAvailable, getOrganizationAiUsage } from "./ai-usage";

const aggregateMock = vi.fn();
const createMock = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiUsageRecord: {
      aggregate: (...args: unknown[]) => aggregateMock(...args),
      create: (...args: unknown[]) => createMock(...args),
    },
  },
}));

describe("ai usage", () => {
  beforeEach(() => {
    aggregateMock.mockReset();
    createMock.mockReset();
  });

  it("sums input and output units for an organization", async () => {
    aggregateMock.mockResolvedValue({
      _sum: { inputUnits: 120, outputUnits: 80 },
    });

    const used = await getOrganizationAiUsage("org-1", new Date("2026-01-01"));
    expect(used).toBe(200);
  });

  it("allows usage below the monthly budget", async () => {
    aggregateMock.mockResolvedValue({
      _sum: { inputUnits: 100, outputUnits: 50 },
    });

    await expect(
      assertAiBudgetAvailable("org-1", 200, 1),
    ).resolves.toBeUndefined();
  });

  it("rejects usage that would exceed the monthly budget", async () => {
    aggregateMock.mockResolvedValue({
      _sum: { inputUnits: 1500, outputUnits: 600 },
    });

    await expect(assertAiBudgetAvailable("org-1", 2000, 1)).rejects.toThrow(
      /budget exceeded/i,
    );
  });
});
