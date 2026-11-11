import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  PRODUCT_EVENTS,
  emitProductEventForOrganization,
  sanitizeProductEvent,
} from "@/lib/platform/product-events";

const rolloutMock = vi.hoisted(() => ({
  isFeatureEnabledForOrganization: vi.fn(),
}));

vi.mock("@/lib/platform/org-rollout", () => rolloutMock);

describe("sanitizeProductEvent", () => {
  it("drops properties that could contain personal or sensitive content", () => {
    const event = sanitizeProductEvent({
      name: PRODUCT_EVENTS.searchCompleted,
      anonymousId: "anon-1",
      organizationId: "org-1",
      occurredAt: "2026-07-24T00:00:00.000Z",
      properties: {
        resultCount: 12,
        email: "researcher@example.com",
        paperAbstract: "private content",
      },
    });

    expect(event.properties).toEqual({ resultCount: 12 });
  });
});

describe("emitProductEventForOrganization", () => {
  beforeEach(() => {
    rolloutMock.isFeatureEnabledForOrganization.mockReset();
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("skips emission when organization analytics are disabled", async () => {
    rolloutMock.isFeatureEnabledForOrganization.mockResolvedValue(false);

    await emitProductEventForOrganization(
      {
        name: PRODUCT_EVENTS.graphSaved,
        anonymousId: "user-1",
        properties: { nodeCount: 10, edgeCount: 12 },
      },
      "org-1",
    );

    expect(console.info).not.toHaveBeenCalled();
  });

  it("emits sanitized events when organization analytics are enabled", async () => {
    rolloutMock.isFeatureEnabledForOrganization.mockResolvedValue(true);

    await emitProductEventForOrganization(
      {
        name: PRODUCT_EVENTS.evidenceReviewed,
        anonymousId: "user-1",
        properties: { edgeType: "supports" },
      },
      "org-1",
    );

    expect(console.info).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(
      String(vi.mocked(console.info).mock.calls[0][0]),
    );
    expect(payload).toMatchObject({
      type: "product_event",
      name: PRODUCT_EVENTS.evidenceReviewed,
      organizationId: "org-1",
      anonymousId: "user-1",
    });
  });
});
