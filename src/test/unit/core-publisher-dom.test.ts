import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { MULTI_PUBLISHER_DOM_FIXTURES } from "@/test/fixtures/test-corpus-10-papers";

// Flag to prevent auto-execution of lifecycle in content.js during module load
(window as unknown as { __ITHACA_TEST_ENV__: boolean }).__ITHACA_TEST_ENV__ =
  true;

const requireModule = createRequire(import.meta.url);
const contentModule = requireModule("../../../extension/content.js");
const { extractPaperMetadata, injectBadge, ROOT_ID } = contentModule;

describe("L7: Multi-Publisher DOM Ingestion & Shadow DOM Isolation", () => {
  const originalLocation = window.location;

  const setLocation = (href: string) => {
    const url = new URL(href);
    delete (window as unknown as { location: unknown }).location;
    (window as unknown as { location: unknown }).location = {
      href: url.href,
      origin: url.origin,
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      pathname: url.pathname,
      search: url.search,
      hash: url.hash,
    };
  };

  beforeEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
    const existingRoot = document.getElementById(ROOT_ID);
    if (existingRoot) existingRoot.remove();
  });

  afterEach(() => {
    (window as unknown as { location: unknown }).location = originalLocation;
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  describe("Scenario 9 & 11: Real-World Academic Repository DOM Extraction", () => {
    it("extracts DOI, title, and version from arXiv abstract pages", () => {
      setLocation("https://arxiv.org/abs/1706.03762v2");
      document.documentElement.innerHTML =
        MULTI_PUBLISHER_DOM_FIXTURES.ARXIV_HTML;

      const meta = extractPaperMetadata();
      expect(meta.doi).toBe("10.48550/arXiv.1706.03762");
      expect(meta.version).toBe("v2");
      expect(meta.title).toBe("Attention Is All You Need");
    });

    it("extracts arXiv DOI and version from direct PDF view URLs", () => {
      setLocation("https://arxiv.org/pdf/1706.03762v1");
      document.body.innerHTML = "<div>PDF Viewer</div>";

      const meta = extractPaperMetadata();
      expect(meta.doi).toBe("10.48550/arXiv.1706.03762");
      expect(meta.version).toBe("v1");
    });

    it("extracts DOI and title from PubMed article markup", () => {
      setLocation("https://pubmed.ncbi.nlm.nih.gov/32000001/");
      document.documentElement.innerHTML =
        MULTI_PUBLISHER_DOM_FIXTURES.PUBMED_HTML;

      const meta = extractPaperMetadata();
      expect(meta.doi).toBe("10.1038/s41586-020-0001-x");
      expect(meta.title).toBe("Deep Learning for Clinical Genomics");
    });

    it("extracts DOI and article heading from Nature.com pages", () => {
      setLocation("https://www.nature.com/articles/nature14539");
      document.documentElement.innerHTML =
        MULTI_PUBLISHER_DOM_FIXTURES.NATURE_HTML;

      const meta = extractPaperMetadata();
      expect(meta.doi).toBe("10.1038/nature14539");
      expect(meta.title).toBe("Deep learning in scientific discovery");
    });

    it("extracts metadata from JSON-LD embedded structured data in SPAs", () => {
      setLocation("https://www.sciencedirect.com/science/article/pii/S0001");
      document.documentElement.innerHTML =
        MULTI_PUBLISHER_DOM_FIXTURES.JSON_LD_SPA_HTML;

      const meta = extractPaperMetadata();
      expect(meta.doi).toBe("10.1016/j.ai.2023.1002");
      expect(meta.title).toBe("Sparse Attention Mechanisms for Long Documents");
    });
  });

  describe("Shadow DOM Isolation & Closed Boundary Security", () => {
    it("injects visual badge host inside a closed shadow root to guarantee CSS isolation", () => {
      setLocation("https://arxiv.org/abs/1706.03762");

      const badgeData = {
        found: true,
        doi: "10.48550/arXiv.1706.03762",
        title: "Attention Is All You Need",
        supports: 340,
        contradicts: 12,
        extends: 85,
        disputeSeverity: "critical",
      };

      injectBadge(badgeData, "http://localhost:3000", { version: "v2" });

      const host = document.getElementById(ROOT_ID);
      expect(host).not.toBeNull();

      // Closed Shadow DOM mode: host.shadowRoot should be inaccessible (null) from page scripts
      expect(host?.shadowRoot).toBeNull();
    });
  });
});
