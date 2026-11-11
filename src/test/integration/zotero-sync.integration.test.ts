import { afterAll, beforeEach, describe, expect, it } from "vitest";
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

const run = canRunIntegrationTests();

describe.runIf(run)("Zotero Sync & Conflict Monitoring API Integration", () => {
  beforeEach(async () => {
    await resetDatabase();
    clearAuthMocks();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("rejects unauthenticated requests", async () => {
    const { POST } = await import("@/app/api/sync/zotero/route");
    const request = buildRequest("http://localhost/api/sync/zotero", {
      method: "POST",
      body: { apiKey: "dummy", userId: "123" },
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it("TC-ZOT-03: syncs library items into collection & paper records", async () => {
    const { POST } = await import("@/app/api/sync/zotero/route");
    const prisma = getTestPrisma();
    const user = await createTestUser();
    const org = await createTestOrganization();
    await createTestMembership({ organization: org, user, role: "MEMBER" });
    setMockSession(user);
    setMockOrganizationCookie(org.id);

    const sampleItems = [
      {
        key: "ABC1",
        version: 1,
        data: {
          key: "ABC1",
          itemType: "journalArticle",
          title: "Deep Residual Learning for Image Recognition",
          creators: [{ firstName: "Kaiming", lastName: "He" }],
          publicationTitle: "CVPR",
          date: "2016",
          DOI: "10.1109/cvpr.2016.90",
        },
      },
    ];

    const request = buildRequest("http://localhost/api/sync/zotero", {
      method: "POST",
      body: {
        apiKey: "test-api-key",
        userId: "test-user-id",
        collectionTitle: "My Zotero Test Collection",
        items: sampleItems,
      },
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.synced).toBe(true);
    expect(body.syncedItemCount).toBe(1);
    expect(body.collectionId).toBeDefined();

    // Verify paper persisted in database
    const savedPaper = await prisma.paperRecord.findFirst({
      where: { organizationId: org.id, doi: "10.1109/cvpr.2016.90" },
    });
    expect(savedPaper).toBeDefined();
    expect(savedPaper?.title).toBe(
      "Deep Residual Learning for Image Recognition",
    );

    // Verify collection contains the paper
    const savedCollection = await prisma.collection.findUnique({
      where: { id: body.collectionId },
    });
    expect(savedCollection?.paperIds).toContain(savedPaper?.id);

    // Verify ZoteroSyncRecord was created
    const syncRecord = await prisma.zoteroSyncRecord.findFirst({
      where: { organizationId: org.id, userId: user.id },
    });
    expect(syncRecord).toBeDefined();
    expect(syncRecord?.syncedItemCount).toBe(1);
  });

  it("TC-ZOT-04: detects active scientific disputes on synced library (GET /api/sync/zotero)", async () => {
    const { POST, GET } = await import("@/app/api/sync/zotero/route");
    const prisma = getTestPrisma();
    const user = await createTestUser();
    const org = await createTestOrganization();
    await createTestMembership({ organization: org, user, role: "MEMBER" });
    setMockSession(user);
    setMockOrganizationCookie(org.id);

    // Seed a contradiction citation in CitationCache for this DOI
    await prisma.citationCache.create({
      data: {
        citingId: "W-CONTRADICTING-STUDY",
        citedId: "10.1109/cvpr.2016.90",
        edgeType: "contradicts",
        confidence: 0.94,
        snippet: "We find severe gradient breakdown contrary to ResNet claims.",
        provider: "gemini/gemini-2.0-flash",
        classifierVersion: 8,
      },
    });

    // Sync item
    const syncReq = buildRequest("http://localhost/api/sync/zotero", {
      method: "POST",
      body: {
        apiKey: "test-api-key",
        userId: "test-user-id",
        collectionTitle: "Disputed Studies",
        items: [
          {
            key: "ABC2",
            data: {
              title: "Deep Residual Learning for Image Recognition",
              DOI: "10.1109/cvpr.2016.90",
            },
          },
        ],
      },
    });
    await POST(syncReq);

    // Now query GET /api/sync/zotero
    const getReq = buildRequest("http://localhost/api/sync/zotero");
    const getRes = await GET(getReq);
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();

    expect(getBody.hasSynced).toBe(true);
    expect(getBody.syncedItemCount).toBe(1);
    expect(getBody.activeDisputeCount).toBe(1);
    expect(getBody.conflictingStudies).toHaveLength(1);
    expect(getBody.conflictingStudies[0].paperIdentifier).toBe(
      "10.1109/cvpr.2016.90",
    );
    expect(getBody.conflictingStudies[0].disputes[0].snippet).toContain(
      "severe gradient breakdown",
    );
  });
});
