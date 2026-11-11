import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { createRequire } from "node:module";

// Load background service worker logic
const requireModule = createRequire(import.meta.url);
const bgModule = requireModule("../../../extension/background.js");
const {
  fetchBadgeData,
  memoryCache,
  inFlightRequests,
  MAX_CACHE_ENTRIES,
  getCachedBadge,
  setCachedBadge,
} = bgModule;

describe("Browser Extension Functional Test Suite (TC-EXT-FUNC)", () => {
  beforeEach(() => {
    memoryCache.clear();
    inFlightRequests.clear();
    vi.restoreAllMocks();
  });

  describe("Background Service Worker Resiliency", () => {
    it("deduplicates concurrent in-flight requests into a single network fetch", async () => {
      let networkCalls = 0;
      const mockBadge = {
        found: true,
        doi: "10.1038/nature12373",
        title: "Mastering the game of Go",
        supports: 2,
        contradicts: 1,
        extends: 1,
      };

      global.fetch = vi.fn().mockImplementation(async () => {
        networkCalls += 1;
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 30));
        return {
          ok: true,
          status: 200,
          json: async () => mockBadge,
        };
      });

      // Simulate 10 simultaneous tabs requesting the same paper badge at once
      const promises = Array.from({ length: 10 }).map(() =>
        fetchBadgeData("10.1038/nature12373", "Mastering the game of Go"),
      );

      const results = await Promise.all(promises);

      // Exactly 1 network fetch should be dispatched across all 10 callers
      expect(networkCalls).toBe(1);
      expect(results).toHaveLength(10);
      for (const res of results) {
        expect(res).toEqual(mockBadge);
      }
      // After completion, inFlightRequests map must be empty
      expect(inFlightRequests.size).toBe(0);
    });

    it("enforces LRU cache eviction and caps memory cache at MAX_CACHE_ENTRIES", async () => {
      // Fill cache with 205 entries (exceeding MAX_CACHE_ENTRIES = 200)
      for (let i = 0; i < 205; i += 1) {
        await setCachedBadge(
          `doi:10.1000/paper-${i}`,
          { id: i, title: `Paper ${i}` },
          "http://localhost:3000",
        );
      }

      // Memory cache should be capped at MAX_CACHE_ENTRIES
      expect(memoryCache.size).toBe(MAX_CACHE_ENTRIES);

      // Oldest items (0-4) should have been evicted
      expect(await getCachedBadge("doi:10.1000/paper-0")).toBeNull();
      expect(await getCachedBadge("doi:10.1000/paper-1")).toBeNull();
      expect(await getCachedBadge("doi:10.1000/paper-4")).toBeNull();

      // Recent items (200-204) should be present
      const recent = await getCachedBadge("doi:10.1000/paper-204");
      expect(recent).not.toBeNull();
      expect(recent.data.id).toBe(204);
    });

    it("propagates arXiv revision version into cache key", async () => {
      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        const isV2 = url.includes("version=v2");
        return {
          ok: true,
          status: 200,
          json: async () => ({
            found: true,
            doi: "10.48550/arXiv.1706.03762",
            queryVersion: isV2 ? "v2" : "v1",
          }),
        };
      });

      const resV1 = await fetchBadgeData(
        "10.48550/arXiv.1706.03762",
        null,
        "v1",
      );
      const resV2 = await fetchBadgeData(
        "10.48550/arXiv.1706.03762",
        null,
        "v2",
      );

      expect(resV1.queryVersion).toBe("v1");
      expect(resV2.queryVersion).toBe("v2");
      // Distinct versions should have distinct cache entries
      expect(memoryCache.has("10.48550/arxiv.1706.03762:v1")).toBe(true);
      expect(memoryCache.has("10.48550/arxiv.1706.03762:v2")).toBe(true);
    });
  });

  describe("Content Script In-Situ DOM & Isolation", () => {
    it("renders in-situ badge inside a Closed Shadow Root with +Stance CTA and dispute preview", async () => {
      // Mock DOM environment simulating an arXiv page
      document.body.innerHTML = `
        <div id="abs">
          <h1 class="title mathjax"><span class="descriptor">Title:</span>Attention Is All You Need</h1>
        </div>
      `;

      // Intercept attachShadow to capture the closed shadow root for assertions
      let capturedShadow: ShadowRoot | null = null;
      const originalAttachShadow = Element.prototype.attachShadow;
      Element.prototype.attachShadow = vi.fn(function (
        this: Element,
        init: ShadowRootInit,
      ) {
        expect(init.mode).toBe("closed"); // MUST be closed to prevent fingerprinting
        capturedShadow = originalAttachShadow.call(this, { mode: "open" }); // open internally for testing
        return capturedShadow;
      });

      // Load and execute content script code in this document
      const contentScriptPath = path.resolve(
        process.cwd(),
        "extension/content.js",
      );
      const contentScriptCode = fs.readFileSync(contentScriptPath, "utf-8");

      // Mock chrome runtime messaging
      const mockBadgeData = {
        found: true,
        doi: "10.48550/arXiv.1706.03762",
        title: "Attention Is All You Need",
        queryVersion: "v2",
        supports: 3,
        contradicts: 1,
        extends: 2,
        disputeSeverity: "critical",
        topDisputeSnippet:
          "Transformer-XL shows vanilla attention suffers from context fragmentation.",
        canonicalUrl: "/explore?doi=10.48550%2FarXiv.1706.03762&version=v2",
      };

      (global as any).chrome = {
        runtime: {
          sendMessage: vi
            .fn()
            .mockImplementation((_msg: any, callback: any) => {
              callback({
                success: true,
                data: mockBadgeData,
                apiBase: "http://localhost:3000",
              });
            }),
          onMessage: { addListener: vi.fn() },
        },
      };

      // Set window location for arXiv
      Object.defineProperty(window, "location", {
        writable: true,
        value: {
          hostname: "arxiv.org",
          pathname: "/abs/1706.03762v2",
          href: "https://arxiv.org/abs/1706.03762v2",
        },
      });

      // Evaluate content script
      eval(contentScriptCode);

      // Verify host element was injected
      const host = document.getElementById("ithaca-extension-root");
      expect(host).not.toBeNull();
      expect(capturedShadow).not.toBeNull();

      // Shadow root must contain inlined style
      const styleEl = capturedShadow!.querySelector("style");
      expect(styleEl).not.toBeNull();
      expect(styleEl!.textContent).toContain(".ithaca-host-container");

      // Version tag must be rendered
      const versionTag = capturedShadow!.querySelector(".ithaca-version-tag");
      expect(versionTag).not.toBeNull();
      expect(versionTag!.textContent).toBe("v2");

      // Critical dispute alert must be applied to contradict pill
      const contradictPill = capturedShadow!.querySelector(
        ".ithaca-pill-contradict",
      );
      expect(contradictPill).not.toBeNull();
      expect(contradictPill!.classList.contains("ithaca-dispute-alert")).toBe(
        true,
      );

      // +Stance contribution button must be present with curate action URL
      const contributeBtn = capturedShadow!.querySelector(
        ".ithaca-badge-contribute",
      ) as HTMLAnchorElement;
      expect(contributeBtn).not.toBeNull();
      expect(contributeBtn.textContent).toBe("+ Stance");
      expect(contributeBtn.href).toContain("action=curate");
      expect(contributeBtn.href).toContain("mode=stance");
      expect(contributeBtn.href).toContain("10.48550%2FarXiv.1706.03762");

      // Dispute popover hover behavior
      const popover = capturedShadow!.querySelector(".ithaca-dispute-popover");
      expect(popover).not.toBeNull();
      expect(popover!.textContent).toContain(
        "Transformer-XL shows vanilla attention suffers from context fragmentation.",
      );

      // Hover triggers active state
      contradictPill!.dispatchEvent(new Event("mouseenter"));
      expect(popover!.classList.contains("active")).toBe(true);

      contradictPill!.dispatchEvent(new Event("mouseleave"));
      expect(popover!.classList.contains("active")).toBe(false);

      // Restore
      Element.prototype.attachShadow = originalAttachShadow;
    });

    it("resiliently extracts JSON-LD metadata for SPA publishers", () => {
      document.body.innerHTML = `
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "ScholarlyArticle",
          "headline": "Universal Epistemic Reasoning in Multi-Agent Graphs",
          "identifier": "doi:10.1016/j.artint.2024.104000"
        }
        </script>
      `;

      // Execute extractJsonLd by running content script functions
      const contentScriptPath = path.resolve(
        process.cwd(),
        "extension/content.js",
      );
      const contentScriptCode = fs.readFileSync(contentScriptPath, "utf-8");

      // Extract JSON-LD via evaluating script in context
      Object.defineProperty(window, "location", {
        writable: true,
        value: {
          hostname: "sciencedirect.com",
          pathname: "/science/article/pii/S00000000000",
          href: "https://www.sciencedirect.com/science/article/pii/S00000000000",
        },
      });

      let capturedMetadata: any = null;
      (global as any).chrome = {
        runtime: {
          sendMessage: vi.fn().mockImplementation((msg: any) => {
            capturedMetadata = msg;
          }),
          onMessage: { addListener: vi.fn() },
        },
      };

      eval(contentScriptCode);

      expect(capturedMetadata).not.toBeNull();
      expect(capturedMetadata.doi).toBe("10.1016/j.artint.2024.104000");
      expect(capturedMetadata.title).toBe(
        "Universal Epistemic Reasoning in Multi-Agent Graphs",
      );
    });
  });
});
