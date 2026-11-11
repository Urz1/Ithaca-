import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanDOI,
  normalizeTitle,
  getTargetCitationContexts,
  batchGetCitationContexts,
  getS2ReferenceContexts,
  s2ReferenceCache,
} from "./semantic-scholar-client";

describe("semantic-scholar-client", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    s2ReferenceCache.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("cleanDOI & normalizeTitle helpers", () => {
    it("cleans DOIs with various prefixes, URLs, and formatting", () => {
      expect(cleanDOI("10.1037/a0021524")).toBe("10.1037/a0021524");
      expect(cleanDOI("https://doi.org/10.1037/a0021524")).toBe("10.1037/a0021524");
      expect(cleanDOI("http://dx.doi.org/10.1037/a0021524")).toBe("10.1037/a0021524");
      expect(cleanDOI("doi: 10.1037/A0021524 ")).toBe("10.1037/a0021524");
      expect(cleanDOI("")).toBeNull();
      expect(cleanDOI("invalid-not-a-doi")).toBeNull();
    });

    it("normalizes paper titles for resilient fallback matching", () => {
      expect(
        normalizeTitle(
          "Why Psychologists Must Change the Way They Analyze Their Data: The Case of Psi!",
        ),
      ).toBe("whypsychologistsmustchangethewaytheyanalyzetheirdatathecaseofpsi");
    });
  });

  describe("getTargetCitationContexts (Single Inverse Query)", () => {
    it("fetches contexts and intents for citing papers in a single HTTP request", async () => {
      const mockCitationsResponse = {
        data: [
          {
            contexts: [
              "We attempted to replicate Bem's (2011) findings but failed to find evidence for psi.",
            ],
            intents: ["ResultComparison"],
            citingPaper: {
              paperId: "citing-paper-1",
              title: "A Failure to Replicate Bem (2011)",
              externalIds: {
                DOI: "10.1371/journal.pone.0033423",
              },
            },
          },
          {
            contexts: ["Bem [35] reported controversial anomalous recall effects."],
            intents: ["Background"],
            citingPaper: {
              paperId: "citing-paper-2",
              title: "Statistical issues in paranormal research",
              externalIds: {},
            },
          },
        ],
      };

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCitationsResponse,
      } as Response);

      const targetDoi = "10.1037/a0021524";
      const contextsMap = await getTargetCitationContexts(targetDoi);

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const url = fetchSpy.mock.calls[0][0] as string;
      expect(url).toContain(`/paper/DOI:${targetDoi}/citations`);

      // Matched by citing DOI
      const citingDoiMatch = contextsMap.get("10.1371/journal.pone.0033423");
      expect(citingDoiMatch).toBeDefined();
      expect(citingDoiMatch?.contexts[0]).toContain("failed to find evidence");
      expect(citingDoiMatch?.intents).toContain("ResultComparison");

      // Matched by citing Title
      const titleMatch = contextsMap.get(
        `title:${normalizeTitle("Statistical issues in paranormal research")}`,
      );
      expect(titleMatch).toBeDefined();
      expect(titleMatch?.contexts[0]).toContain("controversial anomalous recall");
    });

    it("handles HTTP 429 rate limit with backoff retry", async () => {
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            data: [
              {
                contexts: ["Replication after retry succeeded."],
                intents: ["ResultComparison"],
                citingPaper: {
                  externalIds: { DOI: "10.1000/retry-paper" },
                },
              },
            ],
          }),
        } as Response);

      const result = await getTargetCitationContexts("10.1037/retry-test");
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(result.get("10.1000/retry-paper")).toBeDefined();
    });
  });

  describe("batchGetCitationContexts", () => {
    it("resolves all pairs citing a common target in 1 single HTTP request", async () => {
      const targetDoi = "10.1037/a0021524";
      const pairs = [
        {
          citingId: "W1",
          citedId: "W-TARGET",
          citingDoi: "10.1371/journal.pone.0033423",
          citedDoi: targetDoi,
          citingTitle: "Failing the future: replication attempts",
        },
        {
          citingId: "W2",
          citedId: "W-TARGET",
          citingDoi: "10.1037/a0022684",
          citedDoi: targetDoi,
          citingTitle: "Why psychologists must change the way they analyze",
        },
      ];

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              contexts: ["Failed to find any evidence."],
              intents: ["ResultComparison"],
              citingPaper: {
                externalIds: { DOI: "10.1371/journal.pone.0033423" },
                title: "Failing the future: replication attempts",
              },
            },
            {
              contexts: ["Comment on Bem (2011) methodology."],
              intents: ["ResultComparison"],
              citingPaper: {
                externalIds: { DOI: "10.1037/a0022684" },
                title: "Why psychologists must change the way they analyze",
              },
            },
          ],
        }),
      } as Response);

      const resultMap = await batchGetCitationContexts(pairs, { targetDoi });

      expect(fetchSpy).toHaveBeenCalledTimes(1);
      expect(resultMap.size).toBe(2);
      expect(resultMap.get("W1→W-TARGET")?.contexts[0]).toBe("Failed to find any evidence.");
      expect(resultMap.get("W2→W-TARGET")?.contexts[0]).toBe("Comment on Bem (2011) methodology.");
    });
  });

  describe("Cache Poisoning Prevention", () => {
    it("does not write empty array to cache on HTTP 500 failures", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const res = await getS2ReferenceContexts("10.1037/a0021524");
      expect(res.isSuccess).toBe(false);
      expect(s2ReferenceCache.has("10.1037/a0021524")).toBe(false);
    });

    it("writes to cache when request succeeds", async () => {
      vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [
            {
              contexts: ["Real reference sentence."],
              intents: ["Background"],
              citedPaper: { paperId: "cited-1", externalIds: { DOI: "10.1000/ref" } },
            },
          ],
        }),
      } as Response);

      const res = await getS2ReferenceContexts("10.1037/success-paper");
      expect(res.isSuccess).toBe(true);
      expect(s2ReferenceCache.has("10.1037/success-paper")).toBe(true);
      expect(s2ReferenceCache.get("10.1037/success-paper")).toHaveLength(1);
    });
  });
});
