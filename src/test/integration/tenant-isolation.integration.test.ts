import { afterAll, beforeEach, describe, expect, it } from "vitest";
import "@/test/integration/mock-auth";
import {
  canRunIntegrationTests,
  disconnectTestDatabase,
  getTestPrisma,
  resetDatabase,
} from "./db";
import {
  createTestEdgeComment,
  createTestMembership,
  createTestSavedGraph,
  createTwoOrganizationFixture,
} from "./factories";
import {
  clearAuthMocks,
  setMockOrganizationCookie,
  setMockSession,
} from "./mock-auth";
import {
  getGraphSnapshot,
  deleteSavedGraph,
} from "@/app/(app)/dashboard/actions";
import { buildRequest } from "./request";
import { GET as getEdgeComments } from "@/app/api/edges/comments/route";

const run = canRunIntegrationTests();

describe.runIf(run)("tenant isolation", () => {
  beforeEach(async () => {
    await resetDatabase();
    clearAuthMocks();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("does not return another organization's frozen graph snapshot", async () => {
    const { ownerA, ownerB, orgA, orgB } = await createTwoOrganizationFixture();
    const graphA = await createTestSavedGraph({
      user: ownerA,
      organization: orgA,
      title: "Org A debate map",
    });

    setMockSession(ownerB);
    setMockOrganizationCookie(orgB.id);

    const snapshot = await getGraphSnapshot(graphA.id);
    expect(snapshot).toBeNull();
  });

  it("does not delete another organization's saved graph", async () => {
    const { ownerA, ownerB, orgA, orgB } = await createTwoOrganizationFixture();
    const graphA = await createTestSavedGraph({
      user: ownerA,
      organization: orgA,
    });

    setMockSession(ownerB);
    setMockOrganizationCookie(orgB.id);
    await deleteSavedGraph(graphA.id);

    const prisma = getTestPrisma();
    const remaining = await prisma.savedGraph.findUnique({
      where: { id: graphA.id },
    });
    expect(remaining).not.toBeNull();
  });

  it("scopes edge comment reads to the active organization", async () => {
    const { ownerA, ownerB, orgA, orgB } = await createTwoOrganizationFixture();
    await createTestEdgeComment({
      user: ownerA,
      organization: orgA,
      citingId: "W1001",
      citedId: "W1002",
      body: "Org A note",
    });
    await createTestEdgeComment({
      user: ownerB,
      organization: orgB,
      citingId: "W1001",
      citedId: "W1002",
      body: "Org B note",
    });

    setMockSession(ownerA);
    setMockOrganizationCookie(orgA.id);

    const response = await getEdgeComments(
      buildRequest("/api/edges/comments", {
        searchParams: { citingId: "W1001", citedId: "W1002" },
        headers: { cookie: "session=test" },
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.comments).toHaveLength(1);
    expect(payload.comments[0].body).toBe("Org A note");
  });

  it("cannot read edge comments from another org via direct prisma scoping", async () => {
    const { ownerA, orgA, orgB } = await createTwoOrganizationFixture();
    await createTestMembership({
      user: ownerA,
      organization: orgB,
      role: "MEMBER",
    });
    await createTestEdgeComment({
      user: ownerA,
      organization: orgA,
      body: "Scoped to org A only",
    });

    const prisma = getTestPrisma();
    const leaked = await prisma.edgeComment.findMany({
      where: { organizationId: orgB.id },
    });
    expect(leaked).toHaveLength(0);
  });
});
