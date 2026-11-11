import { afterAll, beforeEach, describe, expect, it } from "vitest";
import "@/test/integration/mock-auth";
import {
  canRunIntegrationTests,
  disconnectTestDatabase,
  getTestPrisma,
  resetDatabase,
} from "./db";
import { createTestOrganization, createTestUser } from "./factories";
import { clearAuthMocks } from "./mock-auth";
import { buildRequest } from "./request";

const run = canRunIntegrationTests();

describe.runIf(run)("Browser Extension Badge API Integration", () => {
  beforeEach(async () => {
    await resetDatabase();
    clearAuthMocks();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("handles OPTIONS preflight request with CORS headers", async () => {
    const { OPTIONS } =
      await import("@/app/api/research/extension-badge/route");
    const response = await OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("*");
    expect(response.headers.get("access-control-allow-methods")).toContain(
      "GET",
    );
  });

  it("rejects request missing both doi and title", async () => {
    const { GET } = await import("@/app/api/research/extension-badge/route");
    const request = buildRequest(
      "http://localhost/api/research/extension-badge",
    );
    const response = await GET(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.code).toBe("INVALID_REQUEST");
  });

  it("TC-EXT-01: returns stance breakdown for paper queried by DOI", async () => {
    const { GET } = await import("@/app/api/research/extension-badge/route");
    const prisma = getTestPrisma();
    const user = await createTestUser();
    const org = await createTestOrganization();

    // Seed paper record
    await prisma.paperRecord.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        dedupeKey: "doi:10.1038/nature12373",
        doi: "10.1038/nature12373",
        openAlexId: "W200000001",
        title: "Mastering the game of Go with deep neural networks",
        isSovereignIndex: false,
      },
    });

    // Seed citation cache stances
    await prisma.citationCache.createMany({
      data: [
        {
          citingId: "W100",
          citedId: "W200000001",
          edgeType: "supports",
          confidence: 0.95,
          snippet: "This supports AlphaGo results.",
          provider: "gemini/gemini-2.0-flash",
          classifierVersion: 8,
        },
        {
          citingId: "W101",
          citedId: "W200000001",
          edgeType: "supports",
          confidence: 0.88,
          snippet: "Replicates AlphaGo performance.",
          provider: "gemini/gemini-2.0-flash",
          classifierVersion: 8,
        },
        {
          citingId: "W102",
          citedId: "W200000001",
          edgeType: "contradicts",
          confidence: 0.91,
          snippet: "Contradicts the sample efficiency claim.",
          provider: "gemini/gemini-2.0-flash",
          classifierVersion: 8,
        },
        {
          citingId: "W103",
          citedId: "W200000001",
          edgeType: "extends",
          confidence: 0.87,
          snippet: "Extends AlphaGo to imperfect information.",
          provider: "gemini/gemini-2.0-flash",
          classifierVersion: 8,
        },
      ],
    });

    const request = buildRequest(
      "http://localhost/api/research/extension-badge?doi=10.1038/nature12373",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.found).toBe(true);
    expect(body.doi).toBe("10.1038/nature12373");
    expect(body.supports).toBe(2);
    expect(body.contradicts).toBe(1);
    expect(body.extends).toBe(1);
    expect(body.cites).toBe(0);
    expect(body.total).toBe(4);
    expect(body.weightedScore.supports).toBe(1.83);
    expect(body.weightedScore.contradicts).toBe(0.91);
    expect(body.weightedScore.extends).toBe(0.87);
    expect(body.disputeSeverity).toBe("critical");
    expect(body.highConfidenceDisputes).toBe(1);
    expect(body.canonicalUrl).toBe("/explore?doi=10.1038%2Fnature12373");
    expect(body.topDisputeSnippet).toBe(
      "Contradicts the sample efficiency claim.",
    );
    expect(body.topExtensionSnippet).toBe(
      "Extends AlphaGo to imperfect information.",
    );
  });

  it("TC-EXT-02: returns stance breakdown for paper queried by Title fallback", async () => {
    const { GET } = await import("@/app/api/research/extension-badge/route");
    const prisma = getTestPrisma();
    const user = await createTestUser();
    const org = await createTestOrganization();

    await prisma.paperRecord.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        dedupeKey: "title:attention-is-all-you-need",
        doi: "10.48550/arXiv.1706.03762",
        openAlexId: "W2741809807",
        title: "Attention Is All You Need",
        isSovereignIndex: false,
      },
    });

    await prisma.citationCache.create({
      data: {
        citingId: "W999",
        citedId: "W2741809807",
        edgeType: "extends",
        confidence: 0.9,
        snippet: "Extends transformer architecture.",
        provider: "gemini/gemini-2.0-flash",
        classifierVersion: 8,
      },
    });

    const request = buildRequest(
      "http://localhost/api/research/extension-badge?title=Attention+Is+All+You+Need",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.found).toBe(true);
    expect(body.title).toBe("Attention Is All You Need");
    expect(body.extends).toBe(1);
    expect(body.total).toBe(1);
    expect(body.canonicalUrl).toContain("/explore?doi=");
  });

  it("TC-EXT-03: returns zero-state payload when paper is non-existent", async () => {
    const { GET } = await import("@/app/api/research/extension-badge/route");
    const request = buildRequest(
      "http://localhost/api/research/extension-badge?doi=10.9999/nonexistent",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.found).toBe(false);
    expect(body.supports).toBe(0);
    expect(body.contradicts).toBe(0);
    expect(body.extends).toBe(0);
    expect(body.cites).toBe(0);
    expect(body.total).toBe(0);
    expect(body.canonicalUrl).toBe("/explore?doi=10.9999%2Fnonexistent");
  });

  it("TC-EXT-05: parses and propagates arXiv version parameter into query response", async () => {
    const { GET } = await import("@/app/api/research/extension-badge/route");
    const prisma = getTestPrisma();
    const user = await createTestUser();
    const org = await createTestOrganization();

    await prisma.paperRecord.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        dedupeKey: "arxiv:2301.00001",
        doi: "10.48550/arXiv.2301.00001",
        title: "Advances in Epistemic Logic",
        isSovereignIndex: true,
      },
    });

    const request = buildRequest(
      "http://localhost/api/research/extension-badge?doi=10.48550/arXiv.2301.00001&version=v2",
    );
    const response = await GET(request);
    expect(response.status).toBe(200);
    const body = await response.json();

    expect(body.found).toBe(true);
    expect(body.queryVersion).toBe("v2");
    expect(body.canonicalUrl).toContain("version=v2");
    expect(body.isSovereignIndex).toBe(true);
    expect(body.disputeSeverity).toBe("none");
  });
});
