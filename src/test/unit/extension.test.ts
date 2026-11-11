import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Browser Extension Manifest V3 Compliance (TC-EXT-04)", () => {
  const extensionDir = path.resolve(process.cwd(), "extension");
  const manifestPath = path.join(extensionDir, "manifest.json");

  it("manifest.json exists and is valid Manifest V3", () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const raw = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(raw);

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.name).toContain("Ithaca");
    expect(manifest.version).toBe("1.0.0");
    expect(manifest.permissions).toContain("activeTab");
    expect(manifest.permissions).toContain("storage");

    // Host permissions for academic repositories and local/remote backend
    expect(manifest.host_permissions).toContain("https://arxiv.org/*");
    expect(manifest.host_permissions).toContain(
      "https://pubmed.ncbi.nlm.nih.gov/*",
    );
    expect(manifest.host_permissions).toContain("https://*.nature.com/*");
    expect(manifest.host_permissions).toContain("https://scholar.google.com/*");
    expect(manifest.host_permissions).toContain("http://localhost:3000/*");

    // Service worker
    expect(manifest.background?.service_worker).toBe("background.js");

    // Content scripts
    expect(manifest.content_scripts).toBeDefined();
    expect(manifest.content_scripts.length).toBeGreaterThan(0);
    const mainScript = manifest.content_scripts[0];
    expect(mainScript.js).toContain("content.js");
    expect(mainScript.css).toContain("content.css");

    // Popup and options action
    expect(manifest.action?.default_popup).toBe("popup.html");
    expect(manifest.options_ui?.page).toBe("options.html");
    expect(manifest.web_accessible_resources).toBeDefined();
  });

  it("all required extension assets exist and are populated", () => {
    const requiredFiles = [
      "manifest.json",
      "background.js",
      "content.js",
      "content.css",
      "popup.html",
      "popup.js",
      "options.html",
      "options.js",
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(extensionDir, file);
      expect(fs.existsSync(filePath), `Missing ${file}`).toBe(true);
      const stats = fs.statSync(filePath);
      expect(stats.size).toBeGreaterThan(50);
    }
  });

  it("service worker background.js exports or defines badge fetch logic and session cache", () => {
    const backgroundScript = fs.readFileSync(
      path.join(extensionDir, "background.js"),
      "utf-8",
    );
    expect(backgroundScript).toContain("fetchBadgeData");
    expect(backgroundScript).toContain("/api/research/extension-badge");
    expect(backgroundScript).toContain("memoryCache");
    expect(backgroundScript).toContain("getCachedBadge");
    expect(backgroundScript).toContain("setCachedBadge");
  });

  it("content.js encapsulates the in-situ badge inside a Shadow Root", () => {
    const contentScript = fs.readFileSync(
      path.join(extensionDir, "content.js"),
      "utf-8",
    );
    expect(contentScript).toContain("attachShadow");
    expect(contentScript).toContain("ithaca-extension-root");
    expect(contentScript).toContain("ithaca-dispute-popover");
  });

  it("background.js implements LRU eviction, quota recovery, and single-flight coalescing", () => {
    const bgScript = fs.readFileSync(
      path.join(extensionDir, "background.js"),
      "utf-8",
    );
    expect(bgScript).toContain("MAX_CACHE_ENTRIES");
    expect(bgScript).toContain("pruneSessionCache");
    expect(bgScript).toContain("inFlightRequests");
    expect(bgScript).toContain("inFlightRequests.set");
    expect(bgScript).toContain("inFlightRequests.delete");
  });

  it("content.js enforces closed shadow root, inlined CSS, JSON-LD parsing, and +Stance contribution", () => {
    const contentScript = fs.readFileSync(
      path.join(extensionDir, "content.js"),
      "utf-8",
    );
    // Closed mode prevents host page from querying element.shadowRoot
    expect(contentScript).toContain('attachShadow({ mode: "closed" })');
    // Inlined styles for zero-exposure fingerprint protection
    expect(contentScript).toContain("INLINE_CSS");
    // SPA JSON-LD parser
    expect(contentScript).toContain("extractJsonLd");
    expect(contentScript).toContain("ScholarlyArticle");
    // Bi-directional +Stance contribute CTA
    expect(contentScript).toContain("ithaca-badge-contribute");
    expect(contentScript).toContain("+ Stance");
    // arXiv version extraction
    expect(contentScript).toContain("ithaca-version-tag");
  });

  it("popup.js handles versioned papers, dispute severity alerts, and 1-click contribute CTA", () => {
    const popupScript = fs.readFileSync(
      path.join(extensionDir, "popup.js"),
      "utf-8",
    );
    expect(popupScript).toContain("parseAcademicUrl");
    expect(popupScript).toContain("effectiveVersion");
    expect(popupScript).toContain("disputeSeverityAlert");
    expect(popupScript).toContain("contributeBtn");
  });
});
