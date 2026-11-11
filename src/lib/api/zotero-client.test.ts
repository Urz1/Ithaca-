import { describe, expect, it, vi } from "vitest";
import {
  fetchUserLibrary,
  normalizeZoteroItems,
  findConflictingStudies,
  type ZoteroItem,
} from "./zotero-client";
import { importPapers } from "@/modules/papers/import-papers";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    citationCache: {
      findMany: vi.fn(),
    },
  },
}));

describe("Zotero Web API & JSON Sync Client (TC-ZOT-01, TC-ZOT-02)", () => {
  const sampleZoteroItems: ZoteroItem[] = [
    {
      key: "ITEM1",
      version: 1,
      data: {
        key: "ITEM1",
        itemType: "journalArticle",
        title: "Deep Residual Learning for Image Recognition",
        creators: [
          { firstName: "Kaiming", lastName: "He" },
          { firstName: "Xiangyu", lastName: "Zhang" },
        ],
        publicationTitle: "CVPR",
        date: "2016",
        DOI: "10.1109/CVPR.2016.90",
        abstractNote: "Deeper neural networks are more difficult to train.",
      },
    },
    {
      key: "ITEM2",
      version: 1,
      data: {
        key: "ITEM2",
        itemType: "conferencePaper",
        title: "Attention Is All You Need",
        creators: [
          { firstName: "Ashish", lastName: "Vaswani" },
          { firstName: "Noam", lastName: "Shazeer" },
        ],
        publicationTitle: "NeurIPS",
        date: "2017",
        DOI: "10.48550/arXiv.1706.03762",
      },
    },
  ];

  it("TC-ZOT-01: normalizes Zotero API items into standard ImportedPaper format", () => {
    const papers = normalizeZoteroItems(sampleZoteroItems);
    expect(papers).toHaveLength(2);

    expect(papers[0].title).toBe(
      "Deep Residual Learning for Image Recognition",
    );
    expect(papers[0].identifiers.doi).toBe("10.1109/cvpr.2016.90");
    expect(papers[0].authors).toEqual(["Kaiming He", "Xiangyu Zhang"]);
    expect(papers[0].year).toBe(2016);
    expect(papers[0].venue).toBe("CVPR");
    expect(papers[0].abstract).toContain("Deeper neural networks");

    expect(papers[1].title).toBe("Attention Is All You Need");
    expect(papers[1].identifiers.doi).toBe("10.48550/arxiv.1706.03762");
    expect(papers[1].year).toBe(2017);
  });

  it("TC-ZOT-02: imports native Zotero JSON library via importPapers", () => {
    const jsonPayload = JSON.stringify(sampleZoteroItems);
    const result = importPapers("zotero", jsonPayload);

    expect(result.errors).toHaveLength(0);
    expect(result.papers).toHaveLength(2);
    expect(result.duplicateRows).toHaveLength(0);
    expect(result.totalRows).toBe(2);
  });

  it("fetches library items using Zotero Web API v3 with correct auth headers", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleZoteroItems,
    });
    vi.stubGlobal("fetch", mockFetch);

    const items = await fetchUserLibrary("test-api-key", "123456", {
      limit: 25,
    });
    expect(items).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("https://api.zotero.org/users/123456/items"),
      expect.objectContaining({
        headers: {
          "Zotero-API-Version": "3",
          "Zotero-API-Key": "test-api-key",
          Accept: "application/json",
        },
      }),
    );

    vi.unstubAllGlobals();
  });

  it("findConflictingStudies detects contradiction edges for library papers", async () => {
    (
      prisma.citationCache.findMany as ReturnType<typeof vi.fn>
    ).mockResolvedValue([
      {
        citingId: "W999",
        citedId: "10.1109/cvpr.2016.90",
        snippet: "Shows failure of residual connection under gradient noise.",
        confidence: 0.92,
      },
    ]);

    const alerts = await findConflictingStudies(["10.1109/cvpr.2016.90"]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].paperIdentifier).toBe("10.1109/cvpr.2016.90");
    expect(alerts[0].contradictingCount).toBe(1);
    expect(alerts[0].disputes[0].snippet).toContain("failure of residual");
  });
});
