import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import "@/test/integration/mock-auth";
import {
  canRunIntegrationTests,
  disconnectTestDatabase,
  getTestPrisma,
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
import { PLATFORM_LIMITS } from "@/lib/platform/limits";
import { FEATURE_FLAGS } from "@/lib/platform/feature-flags";
import { setOrganizationRolloutFlag } from "@/lib/platform/org-rollout";

const classifyBatchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/api/citation-classifier", () => ({
  classifyBatch: classifyBatchMock,
  USER_CORRECTION_VERSION: 999,
}));

const run = canRunIntegrationTests();

describe.runIf(run)("API contracts", () => {
  beforeEach(async () => {
    await resetDatabase();
    clearAuthMocks();
    classifyBatchMock.mockReset();
    classifyBatchMock.mockResolvedValue([
      {
        citingId: "W1",
        citedId: "W2",
        edgeType: "supports",
        confidence: 0.91,
        cached: false,
        provider: "test-provider",
      },
    ]);
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  async function seedRoleFixture(role: "MEMBER" | "VIEWER") {
    const actor = await createTestUser({
      email: `${role.toLowerCase()}-${Date.now()}@lab.edu`,
    });
    const org = await createTestOrganization({ plan: "LAB" });
    await createTestMembership({ user: actor, organization: org, role });
    setMockSession(actor);
    setMockOrganizationCookie(org.id);
    return { actor, org };
  }

  it("rejects classify requests with oversized batches", async () => {
    const user = await createTestUser();
    const org = await createTestOrganization();
    await createTestMembership({ user, organization: org, role: "OWNER" });
    setMockSession(user);
    setMockOrganizationCookie(org.id);

    const { POST } = await import("@/app/api/classify/route");
    const citations = Array.from(
      { length: PLATFORM_LIMITS.ai.maxBatchSize + 1 },
      (_, index) => ({
        citingId: `W${index}`,
        citedId: `W${index + 1000}`,
        citingTitle: "Citing",
        citingAbstract: "",
        citedTitle: "Cited",
        citedAbstract: "",
      }),
    );

    const response = await POST(
      buildRequest("/api/classify", {
        method: "POST",
        body: { citations },
      }),
    );

    expect(response.status).toBe(400);
    const payload = await response.json();
    expect(payload.code).toBe("INVALID_REQUEST");
    expect(classifyBatchMock).not.toHaveBeenCalled();
  });

  it("returns service unavailable when AI classification is disabled for the org", async () => {
    const user = await createTestUser();
    const org = await createTestOrganization();
    await createTestMembership({ user, organization: org, role: "OWNER" });
    setMockSession(user);
    setMockOrganizationCookie(org.id);

    await setOrganizationRolloutFlag(
      org.id,
      FEATURE_FLAGS.aiClassification,
      false,
    );

    const { POST } = await import("@/app/api/classify/route");
    const response = await POST(
      buildRequest("/api/classify", {
        method: "POST",
        body: {
          citations: [
            {
              citingId: "W1",
              citedId: "W2",
              citingTitle: "A",
              citingAbstract: "",
              citedTitle: "B",
              citedAbstract: "",
            },
          ],
        },
      }),
    );

    expect(response.status).toBe(503);
    const payload = await response.json();
    expect(payload.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("returns a structured error when the AI budget is exceeded", async () => {
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
        operation: "classify",
        provider: "test",
        model: "test",
        inputUnits: 1500,
        outputUnits: 600,
      },
    });

    const { POST } = await import("@/app/api/classify/route");
    const response = await POST(
      buildRequest("/api/classify", {
        method: "POST",
        body: {
          citations: [
            {
              citingId: "W1",
              citedId: "W2",
              citingTitle: "A",
              citingAbstract: "",
              citedTitle: "B",
              citedAbstract: "",
            },
          ],
        },
      }),
    );

    expect(response.status).toBe(429);
    const payload = await response.json();
    expect(payload.code).toBe("RATE_LIMIT_EXCEEDED");
    expect(classifyBatchMock).not.toHaveBeenCalled();
  });

  it("allows members to correct edges and post comments", async () => {
    await seedRoleFixture("MEMBER");

    const { POST: postCorrect } =
      await import("@/app/api/classify/correct/route");
    const correction = await postCorrect(
      buildRequest("/api/classify/correct", {
        method: "POST",
        body: {
          citingId: "W10",
          citedId: "W20",
          edgeType: "supports",
          comment: "Member correction",
        },
      }),
    );
    expect(correction.status).toBe(200);

    const { POST: postComment } =
      await import("@/app/api/edges/comments/route");
    const comment = await postComment(
      buildRequest("/api/edges/comments", {
        method: "POST",
        body: {
          citingId: "W10",
          citedId: "W20",
          body: "Member note",
          edgeType: "supports",
        },
      }),
    );
    expect(comment.status).toBe(200);
    const commentPayload = await comment.json();
    expect(commentPayload.comment.body).toBe("Member note");
  });

  it("blocks viewers from correcting edges or posting comments", async () => {
    await seedRoleFixture("VIEWER");

    const { POST: postCorrect } =
      await import("@/app/api/classify/correct/route");
    const correction = await postCorrect(
      buildRequest("/api/classify/correct", {
        method: "POST",
        body: {
          citingId: "W10",
          citedId: "W20",
          edgeType: "contradicts",
        },
      }),
    );
    expect(correction.status).toBe(401);

    const { POST: postComment } =
      await import("@/app/api/edges/comments/route");
    const comment = await postComment(
      buildRequest("/api/edges/comments", {
        method: "POST",
        body: {
          citingId: "W10",
          citedId: "W20",
          body: "Should fail",
        },
      }),
    );
    expect(comment.status).toBe(401);
  });
});
