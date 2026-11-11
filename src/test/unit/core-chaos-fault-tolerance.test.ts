import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  classifyCitation,
  type ClassificationInput,
} from "@/lib/api/citation-classifier";
import {
  LLMRouter,
  resetLLMRouterForTesting,
  type ILLMProvider,
} from "@/lib/api/llm-router";
import { prisma } from "@/lib/prisma";
import {
  COLD_UNINDEXED_PAPERS,
  CORPUS_PAPERS,
} from "@/test/fixtures/test-corpus-10-papers";

describe("L4 & L6: Chaos Engineering, Fault Tolerance & Offline Moat", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    resetLLMRouterForTesting();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetLLMRouterForTesting();
    process.env = { ...originalEnv };
  });

  describe("Scenario 4: Cloud Outage & 429/503 Failover to Local Moat", () => {
    it("transparently falls back to local sovereign moat when all remote LLMs fail", async () => {
      // Mock failing remote providers
      const mockFailingGemini: ILLMProvider = {
        name: "gemini",
        model: "gemini-2.5-flash",
        isAvailable: () => true,
        chat: vi
          .fn()
          .mockRejectedValue(
            new Error("Gemini API error (503): Model overloaded"),
          ),
      };

      const mockFailingGroq: ILLMProvider = {
        name: "groq",
        model: "qwen/qwen3.8-27b",
        isAvailable: () => true,
        chat: vi
          .fn()
          .mockRejectedValue(new Error("Groq rate limit reached (429)")),
      };

      // Create a router with failing remotes, then fallback to local
      const { LocalMoatProvider } = await import("@/lib/api/llm-router");
      const router = new LLMRouter([
        mockFailingGemini,
        mockFailingGroq,
        new LocalMoatProvider(),
      ]);

      const response = await router.chat(
        [
          {
            role: "user",
            content: `CITING PAPER: "${CORPUS_PAPERS.P7_DONG_2021.title}"
Abstract: ${CORPUS_PAPERS.P7_DONG_2021.abstract}

CITED PAPER: "${CORPUS_PAPERS.P1_VASWANI_2017.title}"
Abstract: ${CORPUS_PAPERS.P1_VASWANI_2017.abstract}

CITATION CONTEXT SENTENCES:
1. "Our mathematical proof invalidates the claim that pure attention is all you need, showing that deep self-attention without residual connections inevitably suffers from rank collapse."

SEMANTIC SCHOLAR INTENT LABELS: ResultComparison`,
          },
        ],
        true,
      );

      // Verify router succeeded via local moat
      expect(response.provider).toBe("ithaca-local-moat");
      const parsed = JSON.parse(response.content);
      expect(parsed.edgeType).toBe("contradicts");
      expect(parsed.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it("handles full classification pipeline fallback when external fetch fails completely", async () => {
      // Mock global fetch to throw NetworkError (simulating complete internet outage)
      const fetchSpy = vi
        .spyOn(globalThis, "fetch")
        .mockRejectedValue(new Error("Fetch failed: ENOTFOUND api.groq.com"));

      const input: ClassificationInput = {
        citingId: "W_CHAOS_01",
        citedId: CORPUS_PAPERS.P1_VASWANI_2017.id,
        citingTitle: CORPUS_PAPERS.P3_DAI_2019.title,
        citingAbstract: CORPUS_PAPERS.P3_DAI_2019.abstract,
        citedTitle: CORPUS_PAPERS.P1_VASWANI_2017.title,
        citedAbstract: CORPUS_PAPERS.P1_VASWANI_2017.abstract,
        citationContexts: [
          "We show that vanilla self-attention in Vaswani et al. relies on an assumption that fails in practical long sequences, suffering from catastrophic context fragmentation across chunk boundaries.",
        ],
        s2Intents: ["ResultComparison"],
      };

      const result = await classifyCitation(input);

      expect(result.edgeType).toBe("contradicts");
      expect(result.provider).toContain("ithaca-local-moat");
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.snippet).toBeDefined();

      fetchSpy.mockRestore();
    });
  });

  describe("Scenario 5: 100% Offline Airplane Mode", () => {
    it("operates 100% offline with zero network requests when CLASSIFIER_MODE=local", async () => {
      process.env.CLASSIFIER_MODE = "local";

      // Mock prisma cache to eliminate network socket timeout in offline unit test environment
      vi.spyOn(prisma.citationCache, "findUnique").mockResolvedValue(null);
      vi.spyOn(prisma.citationCache, "upsert").mockResolvedValue({} as never);

      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const input: ClassificationInput = {
        citingId: "W_AIRPLANE_01",
        citedId: CORPUS_PAPERS.P1_VASWANI_2017.id,
        citingTitle: CORPUS_PAPERS.P7_DONG_2021.title,
        citingAbstract: CORPUS_PAPERS.P7_DONG_2021.abstract,
        citedTitle: CORPUS_PAPERS.P1_VASWANI_2017.title,
        citedAbstract: CORPUS_PAPERS.P1_VASWANI_2017.abstract,
        citationContexts: [
          "Our mathematical proof invalidates the claim that pure attention is all you need, showing that deep self-attention without residual connections inevitably suffers from rank collapse.",
        ],
        s2Intents: ["ResultComparison"],
      };

      const start = performance.now();
      const result = await classifyCitation(input);
      const elapsedMs = performance.now() - start;

      // Zero network fetch calls made
      expect(fetchSpy).not.toHaveBeenCalled();

      // Executed within strict local latency budget (< 15ms)
      expect(elapsedMs).toBeLessThan(15);

      // Accurate epistemic classification preserved
      expect(result.edgeType).toBe("contradicts");
      expect(result.provider).toContain("ithaca-local-moat");
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });
  });

  describe("Scenario 6: Database Connection Drop Resilience", () => {
    it("continues serving classifications seamlessly if Prisma database drops", async () => {
      // Mock prisma throwing connection error
      const findUniqueSpy = vi
        .spyOn(prisma.citationCache, "findUnique")
        .mockRejectedValue(
          new Error("Can't reach database server at `localhost:5432` [P1001]"),
        );

      const upsertSpy = vi
        .spyOn(prisma.citationCache, "upsert")
        .mockRejectedValue(new Error("Connection terminated unexpectedly"));

      const input: ClassificationInput = {
        citingId: "W_DB_CHAOS_01",
        citedId: CORPUS_PAPERS.P2_DEVLIN_2018.id,
        citingTitle: CORPUS_PAPERS.P5_LIU_2019.title,
        citingAbstract: CORPUS_PAPERS.P5_LIU_2019.abstract,
        citedTitle: CORPUS_PAPERS.P2_DEVLIN_2018.title,
        citedAbstract: CORPUS_PAPERS.P2_DEVLIN_2018.abstract,
        citationContexts: [
          "Our empirical results show no improvement from next sentence prediction, which directly contradicts the claim in Devlin et al. that the NSP loss is necessary for pre-training.",
        ],
        s2Intents: ["ResultComparison"],
      };

      // Ensure classification does NOT throw
      const result = await classifyCitation(input);

      expect(result).toBeDefined();
      expect(result.edgeType).toBe("contradicts");
      expect(result.cached).toBe(false);

      findUniqueSpy.mockRestore();
      upsertSpy.mockRestore();
    }, 15000);
  });

  describe("Scenario 10: Cold & Unindexed Paper Resilience", () => {
    it("gracefully classifies citation to cold unindexed preprints with zero abstracts", async () => {
      const freshPreprint = COLD_UNINDEXED_PAPERS.FRESH_ARXIV_PREPRINT;

      const input: ClassificationInput = {
        citingId: "W_FRESH_CITE_01",
        citedId: "W_UNINDEXED_01",
        citingTitle: "Evaluation of Quantum Attention Horizons",
        citingAbstract: "",
        citedTitle: freshPreprint.title,
        citedAbstract: "",
      };

      // Titles only with unindexed cold preprint -> evidence gate gracefully defaults to "cites"
      const result = await classifyCitation(input);

      expect(result.edgeType).toBe("cites");
      expect(result.provider).toBe("evidence-gate");
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
      expect(result.snippet).toContain("insufficient evidence");
    });
  });
});
