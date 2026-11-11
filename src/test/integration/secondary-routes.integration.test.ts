import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import "@/test/integration/mock-auth";
import {
  canRunIntegrationTests,
  disconnectTestDatabase,
  getTestPrisma,
  resetDatabase,
} from "./db";
import {
  createTestBackgroundJob,
  createTestMembership,
  createTestOrganization,
  createTestStoredArtifact,
  createTestUser,
  createTwoOrganizationFixture,
} from "./factories";
import {
  clearAuthMocks,
  setMockOrganizationCookie,
  setMockSession,
} from "./mock-auth";
import { buildRequest } from "./request";
import { FEATURE_FLAGS } from "@/lib/platform/feature-flags";
import { setOrganizationRolloutFlag } from "@/lib/platform/org-rollout";
import {
  classifyCitation,
  USER_CORRECTION_VERSION,
} from "@/lib/api/citation-classifier";

const llmChatMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    content: "Concise research summary for integration testing.",
    provider: "test-provider",
    model: "test-model",
  }),
);

vi.mock("@/lib/api/llm-router", () => ({
  getLLMRouter: () => ({
    chat: llmChatMock,
  }),
}));

const storeArtifactMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    pathname: "/org/test/export.json",
    url: "https://blob.test/org/test/export.json",
  }),
);

vi.mock("@/lib/platform/artifact-storage", () => ({
  storeOrganizationArtifact: storeArtifactMock,
}));

const run = canRunIntegrationTests();

describe.runIf(run)("secondary API routes", () => {
  beforeEach(async () => {
    await resetDatabase();
    clearAuthMocks();
    llmChatMock.mockClear();
    storeArtifactMock.mockClear();
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  async function seedAuthenticatedOwner() {
    const user = await createTestUser();
    const org = await createTestOrganization({ plan: "LAB" });
    await createTestMembership({ user, organization: org, role: "OWNER" });
    setMockSession(user);
    setMockOrganizationCookie(org.id);
    return { user, org };
  }

  it("requires auth for research stance", async () => {
    const { POST } = await import("@/app/api/research/stance/route");
    const response = await POST(
      buildRequest("/api/research/stance", {
        method: "POST",
        body: { paperId: "W100" },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns structured 400 when research stance is missing paperId", async () => {
    await seedAuthenticatedOwner();
    const { POST } = await import("@/app/api/research/stance/route");
    const response = await POST(
      buildRequest("/api/research/stance", {
        method: "POST",
        body: {},
      }),
    );
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.code).toBe("INVALID_REQUEST");
  });

  it("returns stance data scoped to cached citations", async () => {
    await seedAuthenticatedOwner();
    const prisma = getTestPrisma();
    await prisma.citationCache.create({
      data: {
        citingId: "W100",
        citedId: "W200",
        edgeType: "contradicts",
        confidence: 0.8,
        snippet: "Cached contradiction for stance integration test.",
        provider: "test",
        classifierVersion: 7,
      },
    });

    const { POST } = await import("@/app/api/research/stance/route");
    const response = await POST(
      buildRequest("/api/research/stance", {
        method: "POST",
        body: { paperId: "W100" },
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.stance.contradicts).toBeGreaterThan(0);
  });

  it("requires auth for conflict-path research", async () => {
    const { POST } = await import("@/app/api/research/conflict-path/route");
    const response = await POST(
      buildRequest("/api/research/conflict-path", {
        method: "POST",
        body: {
          sourceId: "W100",
          targetId: "W200",
          nodes: [{ id: "W100" }, { id: "W200" }],
          edges: [
            {
              source: "W100",
              target: "W200",
              edgeType: "contradicts",
            },
          ],
        },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 when conflict-path has no graph payload", async () => {
    await seedAuthenticatedOwner();
    const { POST } = await import("@/app/api/research/conflict-path/route");
    const response = await POST(
      buildRequest("/api/research/conflict-path", {
        method: "POST",
        body: {
          sourceId: "W100",
          targetId: "W200",
          nodes: [],
          edges: [],
        },
      }),
    );
    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.code).toBe("INVALID_REQUEST");
  });

  it("finds a conflict path from inline graph payload", async () => {
    await seedAuthenticatedOwner();
    const { POST } = await import("@/app/api/research/conflict-path/route");
    const response = await POST(
      buildRequest("/api/research/conflict-path", {
        method: "POST",
        body: {
          sourceId: "W100",
          targetId: "W200",
          nodes: [
            { id: "W100", title: "Source" },
            { id: "W200", title: "Target" },
          ],
          edges: [
            {
              source: "W100",
              target: "W200",
              edgeType: "contradicts",
              confidence: 0.9,
            },
          ],
        },
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.paths.length).toBeGreaterThan(0);
  });

  it("returns 503 when summarize is disabled for the organization", async () => {
    const { user, org } = await seedAuthenticatedOwner();
    await setOrganizationRolloutFlag(org.id, FEATURE_FLAGS.aiSummaries, false);

    const { POST } = await import("@/app/api/summarize/route");
    const response = await POST(
      buildRequest("/api/summarize", {
        method: "POST",
        body: {
          title: "Test paper",
          abstract: "This abstract is long enough for validation in tests.",
        },
      }),
    );

    expect(response.status).toBe(503);
    expect(llmChatMock).not.toHaveBeenCalled();
    expect(user.id).toBeTruthy();
  });

  it("returns 429 when summarize exceeds the AI budget", async () => {
    const user = await createTestUser();
    const org = await createTestOrganization({
      plan: "SOLO",
      maxAiRequests: 2000,
    });
    await createTestMembership({ user, organization: org, role: "OWNER" });
    setMockSession(user);
    setMockOrganizationCookie(org.id);
    const prisma = getTestPrisma();
    await prisma.aiUsageRecord.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        operation: "summarize",
        provider: "test",
        model: "test",
        inputUnits: 1500,
        outputUnits: 600,
      },
    });

    const { POST } = await import("@/app/api/summarize/route");
    const response = await POST(
      buildRequest("/api/summarize", {
        method: "POST",
        body: {
          title: "Budgeted paper",
          abstract: "This abstract is long enough for validation in tests.",
        },
      }),
    );

    expect(response.status).toBe(429);
    const payload = await response.json();
    expect(payload.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(llmChatMock).not.toHaveBeenCalled();
  });

  it("requires auth for chat", async () => {
    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(
      buildRequest("/api/chat", {
        method: "POST",
        body: {
          message: "What should I explore next?",
          graphContext: { nodeCount: 2, edgeCount: 1 },
        },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("returns 503 when chat is disabled for the organization", async () => {
    const { org } = await seedAuthenticatedOwner();
    await setOrganizationRolloutFlag(org.id, FEATURE_FLAGS.aiChat, false);

    const { POST } = await import("@/app/api/chat/route");
    const response = await POST(
      buildRequest("/api/chat", {
        method: "POST",
        body: {
          message: "Summarize this graph.",
          graphContext: { nodeCount: 2, edgeCount: 1 },
        },
      }),
    );

    expect(response.status).toBe(503);
    expect(llmChatMock).not.toHaveBeenCalled();
  });

  it("blocks cross-tenant artifact downloads", async () => {
    const { ownerA, ownerB, orgA, orgB } = await createTwoOrganizationFixture();
    const artifact = await createTestStoredArtifact({
      organization: orgA,
      artifactId: "artifact-org-a",
    });

    setMockSession(ownerB);
    setMockOrganizationCookie(orgB.id);

    const { GET } =
      await import("@/app/api/artifacts/[artifactId]/download/route");
    const response = await GET(
      buildRequest(`/api/artifacts/${artifact.id}/download`),
      { params: Promise.resolve({ artifactId: artifact.id }) },
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.code).toBe("INVALID_REQUEST");
    expect(ownerA.id).not.toBe(ownerB.id);
    expect(orgA.id).not.toBe(orgB.id);
  });

  it("writes graph export artifacts under the requesting organization", async () => {
    const { user, org } = await seedAuthenticatedOwner();
    const job = await createTestBackgroundJob({
      user,
      organization: org,
      type: "graph_export",
    });
    const { processGraphExportJob } =
      await import("@/modules/jobs/handlers/graph-export");

    await processGraphExportJob({
      jobId: job.id,
      organizationId: org.id,
      requestedByUserId: user.id,
      artifactId: "graph-export-artifact",
      filename: "debate-map.json",
      content: JSON.stringify({ nodes: [], edges: [] }),
      contentType: "application/json",
    });

    expect(storeArtifactMock).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: org.id }),
    );

    const prisma = getTestPrisma();
    const artifact = await prisma.storedArtifact.findUnique({
      where: { id: "graph-export-artifact" },
    });
    expect(artifact?.organizationId).toBe(org.id);
  });

  it("keeps user corrections ahead of stale classifier cache entries", async () => {
    await seedAuthenticatedOwner();
    const prisma = getTestPrisma();
    await prisma.citationCache.create({
      data: {
        citingId: "W300",
        citedId: "W400",
        edgeType: "supports",
        confidence: 0.55,
        snippet: "Stale classifier cache entry for supersession test.",
        provider: "groq",
        classifierVersion: 7,
      },
    });

    const { POST: postCorrect } =
      await import("@/app/api/classify/correct/route");
    const correction = await postCorrect(
      buildRequest("/api/classify/correct", {
        method: "POST",
        body: {
          citingId: "W300",
          citedId: "W400",
          edgeType: "contradicts",
          comment: "Supersession integration test",
        },
      }),
    );
    expect(correction.status).toBe(200);

    const classified = await classifyCitation({
      citingId: "W300",
      citedId: "W400",
      citingTitle: "Citing",
      citingAbstract: "",
      citedTitle: "Cited",
      citedAbstract: "",
    });

    expect(classified.edgeType).toBe("contradicts");
    expect(classified.provider).toBe("user-correction");
    expect(classified.classifierVersion).toBe(USER_CORRECTION_VERSION);
  });
});
