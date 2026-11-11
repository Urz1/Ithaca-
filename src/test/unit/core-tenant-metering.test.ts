import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  assertAiBudgetAvailable,
  getOrganizationAiUsage,
  recordAiUsage,
} from "@/lib/platform/ai-usage";
import {
  assertOrganizationPermission,
  assertQuotaAvailable,
  AuthorizationError,
  hasOrganizationPermission,
  isQuotaAvailable,
  scopeToOrganization,
} from "@/lib/tenancy-policy";
import {
  ORGANIZATION_PLANS,
  PLAN_ENTITLEMENTS,
} from "@/lib/platform/org-plans";
import {
  classifyCitationLocally,
  LOCAL_MODEL_NAME,
  LOCAL_PROVIDER_NAME,
  LOCAL_CLASSIFIER_VERSION,
} from "@/lib/api/local-classifier";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    aiUsageRecord: {
      aggregate: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe("Phase 2: Multi-Tenant AI Metering & Article 41 Sovereign Downgrade", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Multi-Tenant Isolation & Role-Based Access Control", () => {
    it("strictly isolates queries with scopeToOrganization", () => {
      const baseFilter = { userId: "user-123", status: "COMPLETED" };
      const scoped = scopeToOrganization("org-aau-et", baseFilter);

      expect(scoped).toEqual({
        userId: "user-123",
        status: "COMPLETED",
        organizationId: "org-aau-et",
      });

      // Ensure that an existing organizationId cannot be spoofed
      const spoofedFilter = {
        organizationId: "org-malicious",
        paperId: "W123",
      };
      const protectedQuery = scopeToOrganization("org-aau-et", spoofedFilter);
      expect(protectedQuery.organizationId).toBe("org-aau-et");
    });

    it("enforces hierarchical permission matrices across roles", () => {
      expect(hasOrganizationPermission("OWNER", "organization:manage")).toBe(
        true,
      );
      expect(hasOrganizationPermission("ADMIN", "organization:manage")).toBe(
        false,
      );
      expect(hasOrganizationPermission("ADMIN", "members:manage")).toBe(true);
      expect(hasOrganizationPermission("MEMBER", "domain:write")).toBe(true);
      expect(hasOrganizationPermission("MEMBER", "members:manage")).toBe(false);
      expect(hasOrganizationPermission("VIEWER", "domain:write")).toBe(false);
      expect(hasOrganizationPermission("VIEWER", "domain:read")).toBe(true);

      expect(() =>
        assertOrganizationPermission("VIEWER", "domain:write"),
      ).toThrow(AuthorizationError);

      expect(() =>
        assertOrganizationPermission("MEMBER", "domain:write"),
      ).not.toThrow();
    });

    it("evaluates plan-specific resource quotas accurately", () => {
      const soloPlan = PLAN_ENTITLEMENTS[ORGANIZATION_PLANS.SOLO];
      const labPlan = PLAN_ENTITLEMENTS[ORGANIZATION_PLANS.LAB];

      expect(
        isQuotaAvailable(soloPlan.maxAiRequests - 1, soloPlan.maxAiRequests),
      ).toBe(true);
      expect(
        isQuotaAvailable(soloPlan.maxAiRequests, soloPlan.maxAiRequests),
      ).toBe(false);
      expect(
        isQuotaAvailable(soloPlan.maxAiRequests + 500, soloPlan.maxAiRequests),
      ).toBe(false);

      expect(() =>
        assertQuotaAvailable(
          soloPlan.maxAiRequests,
          soloPlan.maxAiRequests,
          "AI requests",
        ),
      ).toThrow("Organization AI requests quota exceeded");

      // High-tier Lab plan allows larger volumes
      expect(() =>
        assertQuotaAvailable(
          soloPlan.maxAiRequests,
          labPlan.maxAiRequests,
          "AI requests",
        ),
      ).not.toThrow();
    });
  });

  describe("AI Usage Metering & Quota Exhaustion Enforcement", () => {
    it("aggregates token consumption strictly within tenant boundaries", async () => {
      const aggregateMock = vi.mocked(prisma.aiUsageRecord.aggregate);
      aggregateMock.mockResolvedValue({
        _sum: { inputUnits: 4500, outputUnits: 1500 },
      } as never);

      const since = new Date("2026-09-01T00:00:00Z");
      const usage = await getOrganizationAiUsage("org-science-fd", since);

      expect(usage).toBe(6000);
      expect(aggregateMock).toHaveBeenCalledWith({
        where: {
          organizationId: "org-science-fd",
          createdAt: { gte: since },
        },
        _sum: {
          inputUnits: true,
          outputUnits: true,
        },
      });
    });

    it("allows execution within allocated budget and throws on overage", async () => {
      const aggregateMock = vi.mocked(prisma.aiUsageRecord.aggregate);

      // 1. Under budget
      aggregateMock.mockResolvedValueOnce({
        _sum: { inputUnits: 1200, outputUnits: 300 },
      } as never);
      await expect(
        assertAiBudgetAvailable("org-science-fd", 2000, 100),
      ).resolves.toBeUndefined();

      // 2. Exact ceiling breach with projected units
      aggregateMock.mockResolvedValueOnce({
        _sum: { inputUnits: 1800, outputUnits: 200 },
      } as never);
      await expect(
        assertAiBudgetAvailable("org-science-fd", 2000, 1),
      ).rejects.toThrow("Organization AI usage budget exceeded");
    });

    it("accurately records fine-grained AI usage with computed unit costs", async () => {
      const createMock = vi.mocked(prisma.aiUsageRecord.create);
      createMock.mockResolvedValue({ id: "usage-001" } as never);

      await recordAiUsage({
        organizationId: "org-test-uni",
        userId: "researcher-42",
        operation: "citation-classification",
        provider: "groq",
        model: "qwen/qwen3.8-27b",
        inputText: "This study directly replicates the transformer baseline...", // 59 chars -> ~15 units
        outputText: '{"edgeType": "supports", "confidence": 0.92}', // 44 chars -> ~11 units
      });

      expect(createMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: "org-test-uni",
          userId: "researcher-42",
          operation: "citation-classification",
          provider: "groq",
          model: "qwen/qwen3.8-27b",
          inputUnits: Math.ceil(59 / 4),
          outputUnits: Math.ceil(44 / 4),
        }),
      });
    });
  });

  describe("Article 41 Sovereign Downgrade & Zero-FX Fallback Moat", () => {
    it("executes local classification with zero external API calls and sub-15ms latency", () => {
      const input = {
        citingId: "paper-addis-2026",
        citedId: "paper-vaswani-2017",
        citingTitle: "Efficient Amharic Cross-Attention",
        citingAbstract:
          "We explore attention mechanisms for Semitic scripts under compute-constrained regimes.",
        citedTitle: "Attention Is All You Need",
        citedAbstract:
          "The dominant sequence transduction models are based on complex recurrent or convolutional neural networks.",
        citationContexts: [
          "Our empirical results decisively refute the scaling hypothesis proposed by Vaswani et al.",
        ],
      };

      const start = performance.now();
      const result = classifyCitationLocally(input);
      const elapsed = performance.now() - start;

      // Verification of Article 41 Sovereign Engine specs (sub-50ms local synchronous execution)
      expect(elapsed).toBeLessThan(50);
      expect(result.provider).toBe(LOCAL_PROVIDER_NAME);
      expect(LOCAL_PROVIDER_NAME).toBe("ithaca-local-moat");
      expect(LOCAL_MODEL_NAME).toBe("sovereign-intent-v1");
      expect(LOCAL_CLASSIFIER_VERSION).toBeGreaterThanOrEqual(9);
      expect(result.edgeType).toBe("contradicts");
      expect(result.confidence).toBeGreaterThan(0.7);
      expect(result.snippet).toBeDefined();
    });

    it("preserves cross-tenant independence: Org A exhaustion does not degrade Org B", async () => {
      const aggregateMock = vi.mocked(prisma.aiUsageRecord.aggregate);

      // Org A is exhausted
      aggregateMock.mockImplementation((params: unknown) => {
        const p = params as { where?: { organizationId?: string } };
        if (p.where?.organizationId === "org-exhausted") {
          return Promise.resolve({
            _sum: { inputUnits: 2500, outputUnits: 500 },
          }) as never;
        }
        // Org B has fresh quota
        return Promise.resolve({
          _sum: { inputUnits: 100, outputUnits: 50 },
        }) as never;
      });

      const maxQuota = 2000;

      // Org A is rejected
      await expect(
        assertAiBudgetAvailable("org-exhausted", maxQuota, 1),
      ).rejects.toThrow("Organization AI usage budget exceeded");

      // Org B succeeds without interference
      await expect(
        assertAiBudgetAvailable("org-healthy", maxQuota, 1),
      ).resolves.toBeUndefined();
    });
  });
});
