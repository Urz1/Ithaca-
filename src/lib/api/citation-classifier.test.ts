import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  CLASSIFIER_VERSION,
  USER_CORRECTION_VERSION,
  getCachedClassifications,
  classifyCitation,
  classifyBatchStream,
  type ClassificationInput,
  type ClassificationResult,
} from "@/lib/api/citation-classifier";
import { prisma } from "@/lib/prisma";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    citationCache: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
      count: vi.fn(),
    },
  },
}));

// Mock LLM router so we don't make network calls in unit tests
vi.mock("@/lib/api/llm-router", () => ({
  getLLMRouter: vi.fn(() => ({
    chat: vi.fn(async () => ({
      content: JSON.stringify({
        edgeType: "supports",
        confidence: 0.88,
        snippet: "Authors confirm the empirical claim.",
      }),
      provider: "mock-llm",
      model: "mock-model",
    })),
  })),
}));

describe("citation-classifier unit tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("versioning and corrections", () => {
    it("uses a dedicated immutable correction version", () => {
      expect(USER_CORRECTION_VERSION).toBeGreaterThan(100);
      expect(USER_CORRECTION_VERSION).toBe(999);
    });
  });

  describe("getCachedClassifications", () => {
    it("returns an empty map when given empty pairs list", async () => {
      const result = await getCachedClassifications([]);
      expect(result.size).toBe(0);
      expect(prisma.citationCache.findMany).not.toHaveBeenCalled();
    });

    it("retrieves valid cache entries and excludes stale classifier versions", async () => {
      vi.mocked(prisma.citationCache.findMany).mockResolvedValueOnce([
        {
          id: "c1",
          citingId: "W1",
          citedId: "W2",
          edgeType: "supports",
          confidence: 0.92,
          snippet: "Direct support.",
          provider: "gemini/gemini-2.0-flash",
          contexts: JSON.stringify(["Sentence 1"]),
          s2Intents: "ResultComparison",
          isCalibrated: false,
          reviewerId: null,
          calibrationFeedback: null,
          classifierVersion: CLASSIFIER_VERSION, // Current version
          createdAt: new Date(),
        },
        {
          id: "c2",
          citingId: "W3",
          citedId: "W4",
          edgeType: "contradicts",
          confidence: 0.85,
          snippet: "Old contradiction.",
          provider: "groq/llama-3.3",
          contexts: null,
          s2Intents: null,
          isCalibrated: false,
          reviewerId: null,
          calibrationFeedback: null,
          classifierVersion: 3, // Stale version, should be excluded
          createdAt: new Date(),
        },
        {
          id: "c3",
          citingId: "W5",
          citedId: "W6",
          edgeType: "contradicts",
          confidence: 1.0,
          snippet: "Manual user correction.",
          provider: "user-correction",
          contexts: null,
          s2Intents: null,
          isCalibrated: true,
          reviewerId: "user-1",
          calibrationFeedback: "Manual correction",
          classifierVersion: 1, // User corrections are always kept
          createdAt: new Date(),
        },
      ]);

      const map = await getCachedClassifications([
        { citingId: "W1", citedId: "W2" },
        { citingId: "W3", citedId: "W4" },
        { citingId: "W5", citedId: "W6" },
      ]);

      expect(map.size).toBe(2);
      expect(map.has("W1->W2")).toBe(true);
      expect(map.get("W1->W2")?.edgeType).toBe("supports");
      expect(map.get("W1->W2")?.contexts).toEqual(["Sentence 1"]);
      expect(map.has("W3->W4")).toBe(false); // Excluded due to stale version 3
      expect(map.has("W5->W6")).toBe(true); // Kept because provider is user-correction
    });
  });

  describe("sovereign local classification mode (TC-ROUT-02)", () => {
    it("executes local engine directly with provider 'ithaca-local-moat' when CLASSIFIER_MODE=local", async () => {
      vi.stubEnv("CLASSIFIER_MODE", "local");
      vi.mocked(prisma.citationCache.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.citationCache.upsert).mockResolvedValue({} as never);

      const result = await classifyCitation({
        citingId: "W101",
        citedId: "W102",
        citingTitle: "Replication and Validation of Core Claim",
        citingAbstract: "We reproduce the key finding.",
        citedTitle: "Original Study",
        citedAbstract: "Original abstract.",
        citationContexts: [
          "Our experiments confirm and replicate the original finding.",
        ],
        s2Intents: ["ResultComparison"],
      });

      expect(result.provider).toBe("ithaca-local-moat");
      expect(result.edgeType).toBe("supports");
      expect(result.classifierVersion).toBe(CLASSIFIER_VERSION);
      vi.unstubAllEnvs();
    });
  });

  describe("classifyBatchStream", () => {
    it("emits cache hits immediately in initial chunk", async () => {
      vi.mocked(prisma.citationCache.findMany).mockResolvedValueOnce([
        {
          id: "c1",
          citingId: "W10",
          citedId: "W20",
          edgeType: "supports",
          confidence: 0.9,
          snippet: "Cached finding.",
          provider: "gemini",
          contexts: null,
          s2Intents: null,
          isCalibrated: false,
          reviewerId: null,
          calibrationFeedback: null,
          classifierVersion: CLASSIFIER_VERSION,
          createdAt: new Date(),
        },
      ]);

      const inputs: ClassificationInput[] = [
        {
          citingId: "W10",
          citedId: "W20",
          citingTitle: "Paper 10",
          citingAbstract: "Abstract 10",
          citedTitle: "Paper 20",
          citedAbstract: "Abstract 20",
        },
      ];

      const chunks: ClassificationResult[][] = [];
      const stats = await classifyBatchStream(inputs, (chunk) => {
        chunks.push(chunk);
      });

      expect(chunks.length).toBe(1);
      expect(chunks[0][0].citingId).toBe("W10");
      expect(chunks[0][0].cached).toBe(true);
      expect(stats.cached).toBe(1);
      expect(stats.total).toBe(1);
      expect(stats.classified).toBe(0);
    });

    it("processes uncached pairs in micro-batches and streams them", async () => {
      // No cache hits
      vi.mocked(prisma.citationCache.findMany).mockResolvedValueOnce([]);
      vi.mocked(prisma.citationCache.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.citationCache.upsert).mockResolvedValue({} as never);

      const inputs: ClassificationInput[] = [
        {
          citingId: "W1",
          citedId: "W2",
          citingTitle: "Transformer Models",
          citingAbstract: "Novel architecture for neural networks.",
          citedTitle: "Attention Is All You Need",
          citedAbstract: "Self-attention mechanism.",
          citationContexts: ["We validate the Transformer's self-attention."],
          s2Intents: ["ResultComparison"],
        },
        {
          citingId: "W3",
          citedId: "W4",
          citingTitle: "Another Paper",
          citingAbstract: "Another abstract.",
          citedTitle: "Base Paper",
          citedAbstract: "Base abstract.",
          citationContexts: ["We extend this approach."],
          s2Intents: ["Methodology"],
        },
      ];

      const chunks: ClassificationResult[][] = [];
      const stats = await classifyBatchStream(
        inputs,
        (chunk) => {
          chunks.push(chunk);
        },
        2, // Concurrency 2
      );

      expect(chunks.length).toBeGreaterThanOrEqual(1);
      const allResults = chunks.flat();
      expect(allResults.length).toBe(2);
      expect(stats.total).toBe(2);
      expect(stats.cached).toBe(0);
      expect(stats.classified).toBe(2);
    });

    it("respects AbortSignal to cancel streaming early", async () => {
      vi.mocked(prisma.citationCache.findMany).mockResolvedValueOnce([]);
      const controller = new AbortController();
      controller.abort(); // Abort before execution

      const inputs: ClassificationInput[] = [
        {
          citingId: "W1",
          citedId: "W2",
          citingTitle: "A",
          citingAbstract: "AA",
          citedTitle: "B",
          citedAbstract: "BB",
        },
      ];

      const chunks: ClassificationResult[][] = [];
      const stats = await classifyBatchStream(
        inputs,
        (chunk) => {
          chunks.push(chunk);
        },
        1,
        controller.signal,
      );

      expect(chunks.length).toBe(0);
      expect(stats.total).toBe(1);
      expect(stats.classified).toBe(0);
    });
  });
});
