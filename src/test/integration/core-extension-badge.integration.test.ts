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
import {
  CORPUS_PAPERS,
  CORPUS_CITATIONS,
} from "../fixtures/test-corpus-10-papers";
import { CLASSIFIER_VERSION } from "@/lib/api/citation-classifier";

const run = canRunIntegrationTests();

describe.runIf(run)(
  "Core Epistemic Pipeline: Live Extension Badge & Conflict Path Integration",
  () => {
    beforeEach(async () => {
      await resetDatabase();
      clearAuthMocks();
    });

    afterAll(async () => {
      await disconnectTestDatabase();
    });

    async function seed10PaperCorpusDatabase() {
      const user = await createTestUser();
      const org = await createTestOrganization({ plan: "LAB" });
      await createTestMembership({ user, organization: org, role: "OWNER" });
      setMockSession(user);
      setMockOrganizationCookie(org.id);

      const prisma = getTestPrisma();

      // 1. Ingest all 10 PaperRecords
      for (const p of Object.values(CORPUS_PAPERS)) {
        await prisma.paperRecord.create({
          data: {
            organizationId: org.id,
            userId: user.id,
            dedupeKey: p.dedupeKey,
            doi: p.doi,
            openAlexId: p.id,
            title: p.title,
            authors: p.authors,
            year: p.year,
            venue: p.venue,
            abstract: p.abstract,
            isSovereignIndex: false,
          },
        });
      }

      // 2. Ingest all 11 CitationCache edges
      for (const c of CORPUS_CITATIONS) {
        await prisma.citationCache.create({
          data: {
            citingId: c.citingId,
            citedId: c.citedId,
            edgeType: c.expectedStance,
            confidence: c.expectedStance === "contradicts" ? 0.92 : 0.88,
            snippet: c.citationContexts[0],
            provider: "ithaca-local-moat",
            classifierVersion: CLASSIFIER_VERSION,
            isCalibrated: false,
          },
        });
      }

      return { user, org };
    }

    it("TC-INT-01: Correctly resolves Extension Badge for Vaswani (2017) by DOI with Critical dispute severity", async () => {
      await seed10PaperCorpusDatabase();
      const { GET } = await import("@/app/api/research/extension-badge/route");

      const response = await GET(
        buildRequest("/api/research/extension-badge", {
          searchParams: { doi: CORPUS_PAPERS.P1_VASWANI_2017.doi },
        }),
      );

      expect(response.status).toBe(200);
      const data = await response.json();

      expect(data.found).toBe(true);
      expect(data.title).toBe("Attention Is All You Need");
      expect(data.doi).toBe(CORPUS_PAPERS.P1_VASWANI_2017.doi);

      // Epistemic counts: 2 contradicts (Transformer-XL, Dong et al.), 2 extends (BERT, GPT-3), 1 cites (Compressive)
      expect(data.contradicts).toBe(2);
      expect(data.extends).toBe(2);
      expect(data.supports).toBe(0);
      expect(data.cites).toBe(1);
      expect(data.total).toBe(5);

      // High confidence disputes -> severity critical
      expect(data.highConfidenceDisputes).toBe(2);
      expect(data.disputeSeverity).toBe("critical");
      expect(data.weightedScore.contradicts).toBeGreaterThanOrEqual(1.8);
      expect(data.weightedScore.extends).toBeGreaterThanOrEqual(1.7);

      // Verbatim dispute evidence extraction
      expect(data.topDisputeSnippet).toBeDefined();
      expect(typeof data.topDisputeSnippet).toBe("string");
      expect(data.topDisputeSnippet.length).toBeGreaterThan(20);

      // Canonical exploration deep-link
      expect(data.canonicalUrl).toBe(
        `/explore?doi=${encodeURIComponent(CORPUS_PAPERS.P1_VASWANI_2017.doi)}`,
      );
    });

    it("TC-INT-02: Resolves Extension Badge with version tag parameter preserved", async () => {
      await seed10PaperCorpusDatabase();
      const { GET } = await import("@/app/api/research/extension-badge/route");

      const response = await GET(
        buildRequest("/api/research/extension-badge", {
          searchParams: {
            doi: CORPUS_PAPERS.P1_VASWANI_2017.doi,
            version: "v2",
          },
        }),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.found).toBe(true);
      expect(data.queryVersion).toBe("v2");
      expect(data.canonicalUrl).toContain("&version=v2");
    });

    it("TC-INT-03: Resolves Extension Badge for BERT (2018) by Title fallback", async () => {
      await seed10PaperCorpusDatabase();
      const { GET } = await import("@/app/api/research/extension-badge/route");

      const response = await GET(
        buildRequest("/api/research/extension-badge", {
          searchParams: {
            title: "BERT: Pre-training of Deep Bidirectional Transformers",
          },
        }),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.found).toBe(true);
      expect(data.title).toContain("BERT");
      expect(data.contradicts).toBeGreaterThanOrEqual(2); // RoBERTa + Tenney
      expect(data.supports).toBeGreaterThanOrEqual(1); // GPT-3 confirmation
      expect(data.disputeSeverity).toBe("critical");
      expect(data.topDisputeSnippet).toBeDefined();
    });

    it("TC-INT-04: Returns found=false and disputeSeverity=none for unknown paper", async () => {
      await seed10PaperCorpusDatabase();
      const { GET } = await import("@/app/api/research/extension-badge/route");

      const response = await GET(
        buildRequest("/api/research/extension-badge", {
          searchParams: { doi: "10.9999/unknown.unindexed.paper" },
        }),
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.found).toBe(false);
      expect(data.total).toBe(0);
      expect(data.disputeSeverity).toBe("none");
      expect(data.topDisputeSnippet).toBeNull();
    });

    it("TC-INT-05: Finds conflict path over live HTTP endpoint /api/research/conflict-path", async () => {
      await seed10PaperCorpusDatabase();
      const { POST } = await import("@/app/api/research/conflict-path/route");

      const payload = {
        sourceId: CORPUS_PAPERS.P10_BUBECK_2023.id,
        targetId: CORPUS_PAPERS.P1_VASWANI_2017.id,
        nodes: Object.values(CORPUS_PAPERS).map((p) => ({
          id: p.id,
          title: p.title,
          year: p.year,
          authors: p.authorsFormatted,
        })),
        edges: CORPUS_CITATIONS.map((c) => ({
          source: c.citingId,
          target: c.citedId,
          edgeType: c.expectedStance,
          confidence: c.expectedStance === "contradicts" ? 92 : 88,
        })),
      };

      const response = await POST(
        buildRequest("/api/research/conflict-path", {
          method: "POST",
          body: payload,
        }),
      );

      expect(response.status).toBe(200);
      const result = await response.json();

      const paths = result.paths;
      expect(paths).toHaveLength(1);
      expect(paths[0].name).toBe("Conflict Trail");
      expect(paths[0].nodes).toHaveLength(4);
      expect(paths[0].edges).toHaveLength(3);
      expect(paths[0].edges[0].type).toBe("contradicts");
      expect(paths[0].edges[1].type).toBe("contradicts");
    });
  },
);
