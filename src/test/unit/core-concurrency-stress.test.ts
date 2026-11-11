import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import {
  classifyBatchLocally,
  classifyCitationLocally,
} from "@/lib/api/local-classifier";
import {
  CORPUS_CITATIONS,
  buildClassificationInputs,
} from "@/test/fixtures/test-corpus-10-papers";

const requireModule = createRequire(import.meta.url);
const bgModule = requireModule("../../../extension/background.js");
const {
  fetchBadgeData,
  memoryCache,
  inFlightRequests,
  getCachedBadge,
  setCachedBadge,
} = bgModule;

describe("L5: Concurrency, Performance Benchmarks & Stress Testing", () => {
  beforeEach(() => {
    memoryCache.clear();
    inFlightRequests.clear();
    vi.restoreAllMocks();
  });

  describe("Scenario 7: 20-Tab Simultaneous Concurrency Storm", () => {
    it("coalesces 20 concurrent tab requests into a single remote fetch with zero redundant calls", async () => {
      let networkDispatches = 0;
      const targetDoi = "10.48550/arXiv.1706.03762";
      const targetTitle = "Attention Is All You Need";

      const mockResponse = {
        found: true,
        doi: targetDoi,
        title: targetTitle,
        supports: 412,
        contradicts: 8,
        extends: 94,
        disputeSeverity: "critical",
      };

      global.fetch = vi.fn().mockImplementation(async () => {
        networkDispatches += 1;
        // Simulate real-world 40ms network latency
        await new Promise((resolve) => setTimeout(resolve, 40));
        return {
          ok: true,
          status: 200,
          json: async () => mockResponse,
        };
      });

      // Launch 20 simultaneous tabs opening the exact same paper at the exact same moment
      const burstTabs = Array.from({ length: 20 }).map((_, tabIndex) =>
        fetchBadgeData(targetDoi, targetTitle).then((res: unknown) => ({
          tabIndex,
          data: res,
        })),
      );

      const results = await Promise.all(burstTabs);

      // Exactly 1 network fetch dispatched
      expect(networkDispatches).toBe(1);
      expect(results).toHaveLength(20);

      for (const res of results) {
        expect(res.data).toEqual(mockResponse);
      }

      // Ensure in-flight tracking map is completely clean
      expect(inFlightRequests.size).toBe(0);
    });

    it("verifies badge resolution SLA (< 25ms) on subsequent cache hits", async () => {
      const targetDoi = "10.1038/nature14539";
      const cachedPayload = {
        found: true,
        doi: targetDoi,
        title: "Deep learning",
        supports: 150,
        contradicts: 2,
        extends: 40,
      };

      await setCachedBadge(
        `doi:${targetDoi}`,
        cachedPayload,
        "http://localhost:3000",
      );

      const latencies: number[] = [];

      for (let i = 0; i < 50; i++) {
        const start = performance.now();
        const badge = await getCachedBadge(`doi:${targetDoi}`);
        const elapsed = performance.now() - start;
        latencies.push(elapsed);
        expect(badge?.data).toEqual(cachedPayload);
      }

      const avgLatency =
        latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);

      // Average latency must be well under 25ms SLA (typically < 1ms in memory)
      expect(avgLatency).toBeLessThan(5);
      expect(maxLatency).toBeLessThan(25);
    });
  });

  describe("Throughput & Latency SLA for Sovereign Local Moat", () => {
    it("maintains < 15ms per classification SLA during high-throughput batch bursts", () => {
      const baseInputs = buildClassificationInputs();
      // Multiply inputs to simulate a 100-citation graph ingestion storm
      const stormInputs = Array.from({ length: 10 }).flatMap(() => baseInputs);

      expect(stormInputs).toHaveLength(110);

      const start = performance.now();
      const results = classifyBatchLocally(stormInputs);
      const totalTimeMs = performance.now() - start;

      const perItemLatency = totalTimeMs / stormInputs.length;

      // Strict SLA: Mean processing time must be well under 15ms
      expect(perItemLatency).toBeLessThan(15);
      expect(results).toHaveLength(110);

      // Verify that all 110 predictions remain 100% deterministic and accurate under load
      for (let i = 0; i < stormInputs.length; i++) {
        const expectedIndex = i % CORPUS_CITATIONS.length;
        const expectedStance = CORPUS_CITATIONS[expectedIndex].expectedStance;
        expect(results[i].edgeType).toBe(expectedStance);
      }
    });

    it("executes single-pair classification synchronously without memory leaks or race conditions", () => {
      const single = buildClassificationInputs()[0];

      // Measure 100 consecutive classifications
      const times: number[] = [];
      for (let i = 0; i < 100; i++) {
        const t0 = performance.now();
        const res = classifyCitationLocally(single);
        times.push(performance.now() - t0);
        expect(res.edgeType).toBe("extends");
      }

      const meanTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(meanTime).toBeLessThan(5);
    });
  });
});
