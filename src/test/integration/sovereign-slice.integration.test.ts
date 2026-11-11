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

const run = canRunIntegrationTests();

describe.runIf(run)("Sovereign Academic Indexer & Slice Integration", () => {
  beforeEach(async () => {
    await resetDatabase();
    clearAuthMocks();
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("rejects unauthenticated requests to /api/research/sovereign-slice", async () => {
    const { GET } = await import("@/app/api/research/sovereign-slice/route");
    const request = buildRequest(
      "http://localhost/api/research/sovereign-slice",
      {
        method: "GET",
      },
    );

    const response = await GET(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("returns sovereign papers, counts, and institutional breakdown", async () => {
    const { GET } = await import("@/app/api/research/sovereign-slice/route");
    const user = await createTestUser();
    const org = await createTestOrganization();
    await createTestMembership({
      organization: org,
      user,
      role: "MEMBER",
    });
    setMockSession(user);
    setMockOrganizationCookie(org.id);

    const prisma = getTestPrisma();

    // Seed sovereign papers
    await prisma.paperRecord.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        dedupeKey: "sovereign:aau:handle:123456789/101",
        title: "Deep Learning for Ge'ez Script OCR",
        authors: ["Tsegaye, Bekele", "Haile, Selam"],
        advisorNames: ["Dr. Assefa (Advisor)"],
        year: 2023,
        venue: "Addis Ababa University",
        abstract:
          "Novel convolutional transformer for ancient Ge'ez manuscripts.",
        isSovereignIndex: true,
        institutionSlug: "aau",
        repositoryHandle: "http://hdl.handle.net/123456789/101",
      },
    });

    await prisma.paperRecord.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        dedupeKey: "sovereign:jimma:handle:123456789/202",
        title: "Malaria Vector Resistance in Southwestern Ethiopia",
        authors: ["Desta, Kidist"],
        advisorNames: ["Prof. Gemeda"],
        year: 2024,
        venue: "Jimma University",
        abstract:
          "Longitudinal study of insecticide resistance in Anopheles arabiensis.",
        isSovereignIndex: true,
        institutionSlug: "jimma",
        repositoryHandle: "http://hdl.handle.net/123456789/202",
      },
    });

    const request = buildRequest(
      "http://localhost/api/research/sovereign-slice?institution=all",
      {
        method: "GET",
      },
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.count).toBe(2);
    expect(body.totalSovereignInDb).toBe(2);
    expect(body.institutionBreakdown.aau).toBe(1);
    expect(body.institutionBreakdown.jimma).toBe(1);

    expect(body.papers[0].title).toBeDefined();
    expect(body.nodes).toHaveLength(2);
    expect(body.nodes[0].isSovereignIndex).toBe(true);
    expect(body.nodes[0].color).toBe("#059669"); // Emerald green
  });

  it("filters sovereign papers by institution slug", async () => {
    const { GET } = await import("@/app/api/research/sovereign-slice/route");
    const user = await createTestUser();
    const org = await createTestOrganization();
    await createTestMembership({
      organization: org,
      user,
      role: "MEMBER",
    });
    setMockSession(user);
    setMockOrganizationCookie(org.id);

    const prisma = getTestPrisma();

    await prisma.paperRecord.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        dedupeKey: "sovereign:aau:handle:123456789/303",
        title: "Ethiopic Natural Language Processing Benchmarks",
        authors: ["Yilma, Daniel"],
        year: 2022,
        isSovereignIndex: true,
        institutionSlug: "aau",
      },
    });

    await prisma.paperRecord.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        dedupeKey: "sovereign:hawassa:handle:123456789/404",
        title: "Drought Tolerant Enset Cultivation Practices",
        authors: ["Alemu, Martha"],
        year: 2021,
        isSovereignIndex: true,
        institutionSlug: "hawassa",
      },
    });

    const request = buildRequest(
      "http://localhost/api/research/sovereign-slice?institution=aau",
      {
        method: "GET",
      },
    );

    const response = await GET(request);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.count).toBe(1);
    expect(body.papers[0].institutionSlug).toBe("aau");
    expect(body.papers[0].title).toContain("Ethiopic Natural Language");
  });

  it("triggers synchronous harvest via /api/jobs/harvest-nadre with mock", async () => {
    const { POST } = await import("@/app/api/jobs/harvest-nadre/route");
    const user = await createTestUser();
    const org = await createTestOrganization();
    await createTestMembership({
      organization: org,
      user,
      role: "OWNER",
    });
    setMockSession(user);
    setMockOrganizationCookie(org.id);

    const sampleXml = `<?xml version="1.0" encoding="UTF-8" ?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">
  <responseDate>2026-09-08T12:00:00Z</responseDate>
  <request verb="ListRecords" metadataPrefix="oai_dc">http://etd.aau.edu.et/oai/request</request>
  <ListRecords>
    <record>
      <header>
        <identifier>oai:etd.aau.edu.et:123456789/9876</identifier>
        <datestamp>2024-06-01T10:00:00Z</datestamp>
      </header>
      <metadata>
        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:title>Harvested AAU Thesis on Renewable Microgrids</dc:title>
          <dc:creator>Mamo, Ephrem</dc:creator>
          <dc:date>2024</dc:date>
          <dc:identifier>http://hdl.handle.net/123456789/9876</dc:identifier>
        </oai_dc:dc>
      </metadata>
    </record>
  </ListRecords>
</OAI-PMH>`;

    // Mock global fetch for OAI endpoint
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => sampleXml,
    } as unknown as Response);

    try {
      const request = buildRequest("http://localhost/api/jobs/harvest-nadre", {
        method: "POST",
        body: {
          repositorySlug: "aau",
          maxRecords: 10,
          sync: true,
        },
      });

      const response = await POST(request);
      expect(response.status).toBe(200);

      const body = await response.json();
      expect(body.sync).toBe(true);
      expect(body.status).toBe("COMPLETED");
      expect(body.createdCount).toBe(1);

      // Verify the record was persisted in the test database
      const prisma = getTestPrisma();
      const stored = await prisma.paperRecord.findFirst({
        where: { isSovereignIndex: true, institutionSlug: "aau" },
      });
      expect(stored).toBeDefined();
      expect(stored?.title).toContain(
        "Harvested AAU Thesis on Renewable Microgrids",
      );
      expect(stored?.isSovereignIndex).toBe(true);
    } finally {
      global.fetch = originalFetch;
    }
  });
});
