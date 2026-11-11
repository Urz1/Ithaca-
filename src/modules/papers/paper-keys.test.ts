import { describe, expect, it } from "vitest";
import { buildPaperDedupeKey, resolvePaperExploreTarget } from "./paper-keys";
import type { ImportedPaper } from "./types";

const samplePaper = (
  overrides: Partial<ImportedPaper> = {},
): ImportedPaper => ({
  identifiers: {},
  authors: [],
  provenance: [{ format: "doi", row: 1, source: "test" }],
  freshness: { importedAt: "2026-07-24T12:00:00.000Z" },
  ...overrides,
});

describe("buildPaperDedupeKey", () => {
  it("prefers doi then openalex then title/year", () => {
    expect(
      buildPaperDedupeKey(samplePaper({ identifiers: { doi: "10.1000/abc" } })),
    ).toBe("doi:10.1000/abc");
    expect(
      buildPaperDedupeKey(samplePaper({ identifiers: { openAlex: "W123" } })),
    ).toBe("openalex:W123");
    expect(
      buildPaperDedupeKey(samplePaper({ title: "Graph Theory", year: 2020 })),
    ).toBe("title:graph theory|year:2020");
  });
});

describe("resolvePaperExploreTarget", () => {
  it("returns openalex id, then doi, otherwise null", () => {
    expect(
      resolvePaperExploreTarget({
        id: "rec_1",
        openAlexId: "W999",
        doi: "10.1/abc",
      }),
    ).toBe("W999");
    expect(resolvePaperExploreTarget({ id: "rec_1", doi: "10.1/abc" })).toBe(
      "10.1/abc",
    );
    expect(resolvePaperExploreTarget({ id: "rec_1" })).toBeNull();
  });
});
