import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildSovereignDedupeKey,
  parseOaiPmhXml,
} from "@/lib/api/oai-pmh-client";
import {
  fetchUserLibrary,
  syncZoteroLibraryWithIthaca,
  type ZoteroItem,
} from "@/lib/api/zotero-client";
import { prisma } from "@/lib/prisma";

describe("Phase 2: Institutional Ingestion & External Sync (OAI-PMH & Zotero)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("OAI-PMH XML Ingestion & Error Protocol Parsing", () => {
    it("parses valid Dublin Core OAI-PMH records with authors and identifiers", () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">
  <responseDate>2026-09-14T10:00:00Z</responseDate>
  <request verb="ListRecords" metadataPrefix="oai_dc">http://etd.aau.edu.et/oai/request</request>
  <ListRecords>
    <record>
      <header>
        <identifier>oai:aau.edu.et:123456789/4501</identifier>
        <datestamp>2024-05-12T08:30:00Z</datestamp>
        <setSpec>com_123456789_1</setSpec>
      </header>
      <metadata>
        <oai_dc:dc xmlns:oai_dc="http://www.openarchives.org/OAI/2.0/oai_dc/" xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:title>Neural Machine Translation for Low-Resource Ethiopic Languages</dc:title>
          <dc:creator>Tadesse, Bekele</dc:creator>
          <dc:creator>Alemu, Hana</dc:creator>
          <dc:subject>Computer Science</dc:subject>
          <dc:description>We present transformer architectures adapted for Amharic and Tigrinya.</dc:description>
          <dc:date>2024-05-10</dc:date>
          <dc:identifier>http://hdl.handle.net/123456789/4501</dc:identifier>
        </oai_dc:dc>
      </metadata>
    </record>
    <resumptionToken completeListSize="850" cursor="0">token_page_2_abc123</resumptionToken>
  </ListRecords>
</OAI-PMH>`;

      const result = parseOaiPmhXml(xml, "aau");

      expect(result.error).toBeUndefined();
      expect(result.records).toHaveLength(1);

      const record = result.records[0];
      expect(record.title).toBe(
        "Neural Machine Translation for Low-Resource Ethiopic Languages",
      );
      expect(record.authors).toEqual(["Tadesse, Bekele", "Alemu, Hana"]);
      expect(record.year).toBe(2024);
      expect(record.institutionSlug).toBe("aau");
      expect(record.handleUri).toBe("http://hdl.handle.net/123456789/4501");
      expect(record.dedupeKey).toContain(
        "sovereign:aau:handle:hdl.handle.net/123456789/4501",
      );

      // Verify resumption token metadata
      expect(result.resumptionToken).toBe("token_page_2_abc123");
      expect(result.completeListSize).toBe(850);
      expect(result.cursor).toBe(0);
    });

    it("detects and captures OAI protocol error payloads without crashing", () => {
      const errorXml = `<?xml version="1.0" encoding="UTF-8"?>
<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">
  <responseDate>2026-09-14T10:00:00Z</responseDate>
  <request verb="ListRecords">http://etd.aau.edu.et/oai/request</request>
  <error code="noRecordsMatch">No records found matching the requested date range</error>
</OAI-PMH>`;

      const result = parseOaiPmhXml(errorXml, "aau");

      expect(result.records).toHaveLength(0);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe("noRecordsMatch");
      expect(result.error?.message).toContain("No records found");
    });

    it("skips deleted records marked with status='deleted' in OAI headers", () => {
      const xmlWithDeleted = `<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/">
  <ListRecords>
    <record>
      <header status="deleted">
        <identifier>oai:aau.edu.et:deleted_01</identifier>
      </header>
    </record>
    <record>
      <header>
        <identifier>oai:aau.edu.et:active_02</identifier>
      </header>
      <metadata>
        <oai_dc:dc>
          <dc:title>Active Scholarly Monograph</dc:title>
          <dc:creator>Kassa, Mengistu</dc:creator>
        </oai_dc:dc>
      </metadata>
    </record>
  </ListRecords>
</OAI-PMH>`;

      const result = parseOaiPmhXml(xmlWithDeleted, "aau");
      expect(result.records).toHaveLength(1);
      expect(result.records[0].title).toBe("Active Scholarly Monograph");
    });

    it("generates deterministic deduplication keys across institutional handles, OAIs, and titles", () => {
      const keyFromHandle = buildSovereignDedupeKey(
        "zenodo",
        "https://doi.org/10.5281/zenodo.12345",
      );
      expect(keyFromHandle).toBe(
        "sovereign:zenodo:handle:doi.org/10.5281/zenodo.12345",
      );

      const keyFromOai = buildSovereignDedupeKey(
        "arxiv",
        undefined,
        undefined,
        "arXiv:2303.12712",
      );
      expect(keyFromOai).toBe("sovereign:arxiv:oai:arxiv:2303.12712");

      const keyFromTitle = buildSovereignDedupeKey(
        "aau",
        undefined,
        "Specialized Micro-Finance in Tigray Region",
      );
      expect(keyFromTitle).toBe(
        "sovereign:aau:title:specialized-micro-finance-in-tigray-region",
      );
    });
  });

  describe("Zotero Web API Synchronization & Dispute Alerts", () => {
    it("handles Zotero API authentication failures with descriptive error", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
      } as Response);

      await expect(
        fetchUserLibrary("invalid_api_key", "12345"),
      ).rejects.toThrow("Zotero API error: HTTP 401 Unauthorized");

      fetchSpy.mockRestore();
    });

    it("synchronizes user library and detects conflicting studies with active dispute counts", async () => {
      const mockZoteroItems: ZoteroItem[] = [
        {
          key: "ZOTERO_ITEM_01",
          version: 1,
          data: {
            key: "ZOTERO_ITEM_01",
            itemType: "journalArticle",
            title: "Attention Is All You Need",
            creators: [{ lastName: "Vaswani", firstName: "Ashish" }],
            date: "2017",
            DOI: "10.48550/arXiv.1706.03762",
          },
        },
      ];

      // Mock database having a contradicting citation cached for this DOI
      vi.spyOn(prisma.citationCache, "findMany").mockResolvedValue([
        {
          id: "cache_01",
          citingId: "W_DONG_2021",
          citedId: "10.48550/arxiv.1706.03762",
          edgeType: "contradicts",
          confidence: 0.95,
          snippet:
            "Rank collapse theorem invalidates pure attention assumption.",
          provider: "groq/qwen/qwen3.8-27b",
          contexts: null,
          classifierVersion: 8,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ] as never);

      const syncResult = await syncZoteroLibraryWithIthaca(
        mockZoteroItems,
        "org_test",
        "user_test",
      );

      expect(syncResult.syncedItemCount).toBe(1);
      expect(syncResult.importedPapers).toHaveLength(1);
      expect(syncResult.importedPapers[0].title).toBe(
        "Attention Is All You Need",
      );

      // Verify dispute alert detection
      expect(syncResult.activeDisputeCount).toBe(1);
      expect(syncResult.conflictingStudies).toHaveLength(1);
      expect(syncResult.conflictingStudies[0].contradictingCount).toBe(1);
      expect(syncResult.conflictingStudies[0].disputes[0].snippet).toContain(
        "Rank collapse",
      );
    });
  });
});
