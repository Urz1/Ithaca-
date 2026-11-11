import { describe, expect, it } from "vitest";
import { canonicalizeDoi, canonicalizeOpenAlexId, importPapers } from "./index";

const importedAt = "2026-07-24T12:00:00.000Z";

describe("paper identifiers", () => {
  it("canonicalizes DOI URLs and OpenAlex URLs", () => {
    expect(canonicalizeDoi("https://doi.org/10.1000/ABC.1")).toBe(
      "10.1000/abc.1",
    );
    expect(canonicalizeDoi("doi: 10.5555/TEST;")).toBe("10.5555/test");
    expect(canonicalizeOpenAlexId("https://openalex.org/w12345")).toBe(
      "W12345",
    );
  });

  it("rejects malformed identifiers", () => {
    expect(canonicalizeDoi("not-a-doi")).toBeUndefined();
    expect(canonicalizeOpenAlexId("A123")).toBeUndefined();
  });
});

describe("importPapers", () => {
  it("imports Zotero BibTeX exports with zotero provenance", () => {
    const result = importPapers(
      "zotero",
      `@article{smith2020,
  title={Example Paper},
  author={Smith, Ada},
  year={2020},
  doi={10.1000/zotero.1}
}`,
      { source: "zotero", importedAt },
    );

    expect(result.papers).toHaveLength(1);
    expect(result.papers[0]).toMatchObject({
      identifiers: { doi: "10.1000/zotero.1" },
      provenance: [{ format: "zotero", source: "zotero" }],
    });
  });

  it("imports Zotero BibTeX with OpenAlex paper ids", () => {
    const result = importPapers(
      "zotero",
      `@article{zoteroOpenAlex,
  title={Zotero OpenAlex Paper},
  author={Lee, Chris},
  year={2019},
  openalex={https://openalex.org/W4242}
}`,
      { source: "zotero", importedAt },
    );

    expect(result.papers).toHaveLength(1);
    expect(result.papers[0].identifiers).toEqual({ openAlex: "W4242" });
    expect(result.papers[0].title).toBe("Zotero OpenAlex Paper");
  });

  it("imports and deduplicates DOI lists with provenance", () => {
    const result = importPapers(
      "doi",
      "https://doi.org/10.1000/ABC\n10.1000/abc\nbad-value",
      { source: "clipboard", importedAt },
    );

    expect(result.papers).toHaveLength(1);
    expect(result.papers[0]).toMatchObject({
      identifiers: { doi: "10.1000/abc" },
      provenance: [
        { format: "doi", row: 1, source: "clipboard" },
        { format: "doi", row: 2, source: "clipboard" },
      ],
      freshness: { importedAt },
    });
    expect(result.duplicateRows).toEqual([2]);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 2, code: "DUPLICATE" }),
        expect.objectContaining({ row: 3, code: "INVALID_DOI" }),
        expect.objectContaining({ row: 3, code: "MISSING_IDENTIFIER" }),
      ]),
    );
  });

  it("imports multiline BibTeX and preserves its existing parser boundary", () => {
    const input = `@article{one,
      title = {A {Nested} Research Title},
      author = {Doe, Jane and Smith, John},
      year = {2024},
      journal = "Journal of Tests",
      doi = {https://doi.org/10.1234/ONE},
      openalex = {https://openalex.org/W987},
      updated = {2025-03-01}
    }`;

    const result = importPapers("bibtex", input, { importedAt });

    expect(result.errors).toEqual([]);
    expect(result.papers[0]).toMatchObject({
      identifiers: { doi: "10.1234/one", openAlex: "W987" },
      title: "A {Nested} Research Title",
      authors: ["Doe, Jane", "Smith, John"],
      year: 2024,
      venue: "Journal of Tests",
      freshness: {
        importedAt,
        sourceUpdatedAt: "2025-03-01T00:00:00.000Z",
      },
    });
  });

  it("returns a structured error for malformed BibTeX", () => {
    const result = importPapers("bibtex", "@article{broken, title={Missing}");

    expect(result.papers).toEqual([]);
    expect(result.errors[0]).toMatchObject({
      row: 1,
      code: "MALFORMED_BIBTEX",
    });
  });

  it("imports RIS fields and author rows", () => {
    const input = `TY  - JOUR
TI  - Evidence Synthesis
AU  - Doe, Jane
AU  - Roe, Richard
PY  - 2023/01/01
DO  - 10.4321/RIS
AN  - https://openalex.org/W42
JO  - Research Journal
ER  -`;

    const result = importPapers("ris", input, { importedAt });

    expect(result.errors).toEqual([]);
    expect(result.papers[0]).toMatchObject({
      identifiers: { doi: "10.4321/ris", openAlex: "W42" },
      title: "Evidence Synthesis",
      authors: ["Doe, Jane", "Roe, Richard"],
      year: 2023,
      venue: "Research Journal",
    });
  });

  it("reports malformed RIS rows while retaining valid records", () => {
    const input = `TY  - JOUR
TI  - Still Useful
DO  - 10.1234/useful
this is invalid
ER  -`;
    const result = importPapers("ris", input);

    expect(result.papers).toHaveLength(1);
    expect(result.errors).toContainEqual(
      expect.objectContaining({ row: 4, code: "MALFORMED_RIS" }),
    );
  });

  it("parses quoted CSV values, aliases, and title-based records", () => {
    const input = `title,authors,publication-year,doi,openalex_id,journal,updated
"Trials, Revisited","Doe, Jane;Roe, Richard",2022,10.7777/CSV,https://openalex.org/w77,Medicine,2024-01-02
Identifier-free title,A. Author,2020,,,Archive,`;
    const result = importPapers("csv", input, { importedAt });

    expect(result.errors).toEqual([]);
    expect(result.totalRows).toBe(2);
    expect(result.papers).toHaveLength(2);
    expect(result.papers[0]).toMatchObject({
      title: "Trials, Revisited",
      authors: ["Doe, Jane", "Roe, Richard"],
      year: 2022,
      identifiers: { doi: "10.7777/csv", openAlex: "W77" },
    });
    expect(result.papers[1]).toMatchObject({
      title: "Identifier-free title",
      year: 2020,
    });
  });

  it("reports CSV shape, identifier, and year errors by row", () => {
    const input = `title,doi,year
Bad row,invalid,twenty
Wrong width,10.1000/valid,2024,extra`;
    const result = importPapers("csv", input);

    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ row: 2, code: "INVALID_DOI", field: "doi" }),
        expect.objectContaining({
          row: 2,
          code: "INVALID_YEAR",
          field: "year",
        }),
        expect.objectContaining({ row: 3, code: "MALFORMED_CSV" }),
      ]),
    );
  });

  it("deduplicates identifier-free papers by normalized title and year", () => {
    const result = importPapers(
      "csv",
      `title,year,authors
Same Paper,2021,Alice
same paper,2021,Bob`,
    );

    expect(result.papers).toHaveLength(1);
    expect(result.papers[0].authors).toEqual(["Alice", "Bob"]);
    expect(result.papers[0].provenance).toHaveLength(2);
    expect(result.duplicateRows).toEqual([3]);
  });

  it("deduplicates when either canonical identifier matches", () => {
    const result = importPapers(
      "csv",
      `title,doi,openalex
First,10.1000/shared,W100
Second,,https://openalex.org/w100`,
    );

    expect(result.papers).toHaveLength(1);
    expect(result.papers[0].identifiers).toEqual({
      doi: "10.1000/shared",
      openAlex: "W100",
    });
    expect(result.duplicateRows).toEqual([3]);
  });

  it("handles empty input without throwing", () => {
    expect(importPapers("csv", "  \n")).toMatchObject({
      papers: [],
      totalRows: 0,
      errors: [{ row: 0, code: "EMPTY_INPUT" }],
    });
  });
});
