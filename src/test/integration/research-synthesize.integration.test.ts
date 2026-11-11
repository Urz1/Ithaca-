import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import "@/test/integration/mock-auth";
import {
  canRunIntegrationTests,
  disconnectTestDatabase,
  resetDatabase,
} from "./db";
import {
  createTestMembership,
  createTestOrganization,
  createTestUser,
} from "./factories";
import {
  clearAuthMocks,
  setMockOrganizationCookie,
  setMockSession,
} from "./mock-auth";
import { buildRequest } from "./request";
import { FEATURE_FLAGS } from "@/lib/platform/feature-flags";
import { setOrganizationRolloutFlag } from "@/lib/platform/org-rollout";

const run = canRunIntegrationTests();

describe.runIf(run)("POST /api/research/synthesize", () => {
  beforeEach(async () => {
    await resetDatabase();
    clearAuthMocks();
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("rejects unauthenticated requests", async () => {
    const { POST } = await import("@/app/api/research/synthesize/route");
    const request = buildRequest("http://localhost/api/research/synthesize", {
      method: "POST",
      body: {
        topic: "Transformers",
        nodes: [{ id: "n1", title: "Paper 1" }],
        edges: [],
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("rejects invalid request payloads with missing nodes", async () => {
    const { POST } = await import("@/app/api/research/synthesize/route");
    const user = await createTestUser();
    setMockSession(user);

    const request = buildRequest("http://localhost/api/research/synthesize", {
      method: "POST",
      body: {
        topic: "Invalid Payload",
        nodes: [], // empty nodes violates min(1)
        edges: [],
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("INVALID_REQUEST");
  });

  it("returns service unavailable when AI feature flag is disabled", async () => {
    const { POST } = await import("@/app/api/research/synthesize/route");
    const user = await createTestUser();
    const org = await createTestOrganization();
    await createTestMembership({
      organization: org,
      user,
      role: "OWNER",
    });
    setMockSession(user);
    setMockOrganizationCookie(org.id);

    await setOrganizationRolloutFlag(
      org.id,
      FEATURE_FLAGS.aiClassification,
      false,
    );

    const request = buildRequest("http://localhost/api/research/synthesize", {
      method: "POST",
      body: {
        topic: "Disabled AI",
        nodes: [{ id: "n1", title: "Paper 1" }],
        edges: [],
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("synthesizes a 3-part literature review draft with disputes & foundational lineage", async () => {
    const { POST } = await import("@/app/api/research/synthesize/route");
    const user = await createTestUser();
    const org = await createTestOrganization();
    await createTestMembership({
      organization: org,
      user,
      role: "OWNER",
    });
    setMockSession(user);
    setMockOrganizationCookie(org.id);

    await setOrganizationRolloutFlag(
      org.id,
      FEATURE_FLAGS.aiClassification,
      true,
    );

    const nodes = [
      {
        id: "p1",
        title: "Attention Is All You Need",
        authors: "Vaswani et al.",
        year: 2017,
        citations: 120000,
      },
      {
        id: "p2",
        title: "FlashAttention: Fast and Memory-Efficient Exact Attention",
        authors: "Dao et al.",
        year: 2022,
        citations: 2000,
      },
      {
        id: "p3",
        title: "BERT: Pre-training of Deep Bidirectional Transformers",
        authors: "Devlin et al.",
        year: 2018,
        citations: 80000,
      },
    ];

    const edges = [
      {
        id: "e1",
        source: "p2",
        target: "p1",
        edgeType: "contradicts",
        snippet: "Proves standard quadratic memory IO is a bottleneck.",
        contexts: [
          "We contest the practical scaling limits of standard GPU memory architectures.",
        ],
      },
      {
        id: "e2",
        source: "p3",
        target: "p1",
        edgeType: "supports",
        snippet:
          "Successfully applies Transformer encoder to bidirectional masked pre-training.",
      },
    ];

    const request = buildRequest("http://localhost/api/research/synthesize", {
      method: "POST",
      body: {
        topic: "Transformer Scaling & Memory Efficiency",
        nodes,
        edges,
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.synthesis).toBeDefined();

    const review = body.synthesis;
    expect(review.title).toContain("Transformer Scaling & Memory Efficiency");
    expect(review.sections.foundationalLineage).toBeDefined();
    expect(review.sections.foundationalLineage.title).toBeDefined();
    expect(review.sections.foundationalLineage.content).toBeTruthy();

    expect(review.sections.empiricalFrictions).toBeDefined();
    expect(review.sections.empiricalFrictions.disputesCount).toBe(1);
    expect(review.sections.empiricalFrictions.clashes).toHaveLength(1);
    expect(review.sections.empiricalFrictions.clashes[0].claim).toContain(
      "quadratic memory",
    );

    expect(review.sections.unresolvedHorizons).toBeDefined();
    expect(
      review.sections.unresolvedHorizons.openQuestions.length,
    ).toBeGreaterThanOrEqual(1);

    expect(review.fullMarkdown).toContain("# Literature Review");
    expect(review.fullMarkdown).toContain("Attention Is All You Need");
    expect(review.meta.paperCount).toBe(3);
    expect(review.meta.disputeCount).toBe(1);
  });
});
