// Ithaca Content Script - Live Stance Ingestion & Visual Badges (Manifest V3)
(function () {
  "use strict";

  const ROOT_ID = "ithaca-extension-root";

  const INLINE_CSS = `
:host {
  all: initial;
}
.ithaca-host-container {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
}
.ithaca-host-container:hover {
  transform: translateY(-2px);
}
.ithaca-dispute-popover {
  position: absolute;
  bottom: calc(100% + 10px);
  right: 0;
  width: 290px;
  padding: 10px 12px;
  background: rgba(15, 23, 42, 0.96);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(239, 68, 68, 0.45);
  border-radius: 8px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
  color: #f8fafc;
  font-size: 11px;
  line-height: 1.45;
  opacity: 0;
  visibility: hidden;
  transform: translateY(6px);
  transition: opacity 0.15s ease, transform 0.15s ease, visibility 0.15s;
  pointer-events: none;
  z-index: 2147483648;
}
.ithaca-dispute-popover.active {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}
.ithaca-popover-header {
  font-weight: 700;
  color: #f87171;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.ithaca-popover-quote {
  color: #cbd5e1;
  font-style: italic;
  display: block;
}
.ithaca-badge-link {
  text-decoration: none !important;
  color: inherit !important;
}
.ithaca-badge-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  background: rgba(15, 23, 42, 0.94);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 9999px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.35), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
  color: #f8fafc;
}
.ithaca-brand-logo {
  font-weight: 700;
  font-size: 12px;
  letter-spacing: -0.01em;
  color: #38bdf8;
  display: flex;
  align-items: center;
  gap: 4px;
}
.ithaca-version-tag {
  background: rgba(148, 163, 184, 0.18);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.35);
  font-size: 10px;
  font-weight: 600;
  padding: 1px 5px;
  border-radius: 4px;
}
.ithaca-sovereign-tag {
  background: rgba(16, 185, 129, 0.2);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.4);
  font-size: 10px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 6px;
}
.ithaca-stance-pill-group {
  display: flex;
  align-items: center;
  gap: 6px;
}
.ithaca-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
}
.ithaca-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
.ithaca-pill-support {
  background: rgba(34, 197, 94, 0.15);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.3);
}
.dot-green {
  background: #22c55e;
}
.ithaca-pill-contradict {
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.3);
  transition: all 0.2s ease;
}
.ithaca-pill-contradict.ithaca-dispute-alert {
  animation: ithaca-dispute-pulse 2s infinite ease-in-out;
  border-color: rgba(239, 68, 68, 0.7);
}
@keyframes ithaca-dispute-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50% { box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.15); }
}
.dot-red {
  background: #ef4444;
}
.ithaca-pill-extend {
  background: rgba(168, 85, 247, 0.15);
  color: #c084fc;
  border: 1px solid rgba(168, 85, 247, 0.3);
}
.dot-purple {
  background: #a855f7;
}
.ithaca-badge-cta {
  font-size: 11px;
  font-weight: 500;
  color: #94a3b8;
  padding-left: 4px;
  border-left: 1px solid rgba(255, 255, 255, 0.15);
  transition: color 0.15s ease;
}
.ithaca-badge-inner:hover .ithaca-badge-cta {
  color: #38bdf8;
}
.ithaca-badge-contribute {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  background: rgba(56, 189, 248, 0.15);
  color: #38bdf8 !important;
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-radius: 9999px;
  font-size: 11px;
  font-weight: 600;
  text-decoration: none !important;
  transition: all 0.15s ease;
  cursor: pointer;
  margin-left: 4px;
}
.ithaca-badge-contribute:hover {
  background: rgba(56, 189, 248, 0.28);
  border-color: #38bdf8;
  color: #ffffff !important;
}
`;

  function normalizeDoi(raw) {
    if (!raw || typeof raw !== "string") return null;
    let cleaned = raw.trim();
    cleaned = cleaned.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
    cleaned = cleaned.replace(/^doi:\s*/i, "");
    return cleaned.trim() || null;
  }

  function extractJsonLd() {
    try {
      const scripts = document.querySelectorAll(
        'script[type="application/ld+json"]',
      );
      for (const script of scripts) {
        const text = script.textContent?.trim();
        if (!text) continue;
        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch {
          continue;
        }
        const items = Array.isArray(parsed)
          ? parsed
          : parsed["@graph"] || [parsed];
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const type = item["@type"];
          const isScholarly =
            type === "ScholarlyArticle" ||
            type === "MedicalScholarlyArticle" ||
            type === "Article" ||
            type === "PublicationIssue" ||
            (Array.isArray(type) &&
              (type.includes("ScholarlyArticle") || type.includes("Article")));

          if (isScholarly) {
            let doi = null;
            let title = null;

            if (typeof item.identifier === "string") {
              doi = normalizeDoi(item.identifier);
            } else if (item.identifier && typeof item.identifier === "object") {
              const val = item.identifier.value || item.identifier.name || "";
              doi = normalizeDoi(val);
            }

            if (!doi && typeof item.sameAs === "string") {
              doi = normalizeDoi(item.sameAs);
            }

            if (typeof item.name === "string") {
              title = item.name.trim();
            } else if (typeof item.headline === "string") {
              title = item.headline.trim();
            }

            if (doi || title) {
              return { doi, title };
            }
          }
        }
      }
    } catch {
      // Ignore JSON-LD parse errors
    }
    return { doi: null, title: null };
  }

  function extractPaperMetadata() {
    const metaDoi =
      document
        .querySelector('meta[name="citation_doi"]')
        ?.getAttribute("content") ||
      document
        .querySelector('meta[name="dc.identifier"]')
        ?.getAttribute("content") ||
      document
        .querySelector('meta[name="bepress_citation_doi"]')
        ?.getAttribute("content") ||
      document.querySelector('meta[name="prism.doi"]')?.getAttribute("content");

    const metaTitle =
      document
        .querySelector('meta[name="citation_title"]')
        ?.getAttribute("content") ||
      document
        .querySelector('meta[name="dc.title"]')
        ?.getAttribute("content") ||
      document
        .querySelector('meta[name="prism.publicationName"]')
        ?.getAttribute("content");

    let doi = normalizeDoi(metaDoi);
    let title = metaTitle || null;
    let version = null;

    // Domain-specific extraction fallbacks
    const hostname = window.location.hostname;
    if (hostname.includes("arxiv.org")) {
      const arxivMatch = window.location.pathname.match(
        /\/(?:abs|pdf)\/([0-9]+\.[0-9]+)(?:v([0-9]+))?/i,
      );
      if (arxivMatch) {
        doi = `10.48550/arXiv.${arxivMatch[1]}`;
        if (arxivMatch[2]) {
          version = `v${arxivMatch[2]}`;
        }
      }
      if (!title) {
        const titleEl = document.querySelector(".title");
        if (titleEl) {
          title = titleEl.textContent.replace(/^Title:\s*/i, "").trim();
        }
      }
    } else if (hostname.includes("pubmed")) {
      const doiEl = document.querySelector(
        ".citation-doi, .identifier.doi .id-link",
      );
      if (doiEl && !doi) {
        doi = normalizeDoi(doiEl.textContent);
      }
      if (!title) {
        const heading = document.querySelector(".heading-title");
        if (heading) title = heading.textContent.trim();
      }
    } else if (hostname.includes("nature.com")) {
      if (!title) {
        const titleEl = document.querySelector("h1.c-article-title");
        if (titleEl) title = titleEl.textContent.trim();
      }
    } else if (hostname.includes("scholar.google")) {
      // Conservative single-item extraction to avoid triggering anti-bot heuristics
      const firstResult = document.querySelector(".gs_r.gs_or.gs_scl .gs_rt a");
      if (firstResult) {
        title = firstResult.textContent.trim();
      }
    }

    // JSON-LD structured data fallback for SPAs (Elsevier, Springer, Wiley)
    if (!doi || !title) {
      const jsonLd = extractJsonLd();
      if (!doi && jsonLd.doi) doi = normalizeDoi(jsonLd.doi);
      if (!title && jsonLd.title) title = jsonLd.title;
    }

    return { doi: normalizeDoi(doi), title, version };
  }

  function createPill(type, dotClass, count, titleText) {
    const pill = document.createElement("span");
    pill.className = `ithaca-pill ithaca-pill-${type}`;
    pill.setAttribute("title", `${count} ${titleText}`);

    const dot = document.createElement("span");
    dot.className = `ithaca-dot ${dotClass}`;

    const textNode = document.createTextNode(` ${count}`);

    pill.append(dot, textNode);
    return pill;
  }

  function injectBadge(data, canonicalBase, queryMeta) {
    if (!data) return;

    let host = document.getElementById(ROOT_ID);
    if (host) {
      host.remove(); // Clean update on re-navigation
    }

    host = document.createElement("div");
    host.id = ROOT_ID;

    // Attach Closed Shadow Root for total style isolation & fingerprint prevention
    const shadow = host.attachShadow({ mode: "closed" });

    // Inline stylesheet inside Shadow DOM to eliminate web-accessible resource footprinting
    const styleEl = document.createElement("style");
    styleEl.textContent = INLINE_CSS;
    shadow.appendChild(styleEl);

    // Host position container
    const container = document.createElement("div");
    container.className = "ithaca-host-container";

    const isSovereign = data.isSovereignIndex;
    const rawCanonical = data.canonicalUrl || "/explore";
    const exploreUrl = rawCanonical.startsWith("http")
      ? rawCanonical
      : `${canonicalBase || "http://localhost:3000"}${rawCanonical}`;

    // Link wrapper
    const a = document.createElement("a");
    a.className = "ithaca-badge-link";
    if (exploreUrl.startsWith("http://") || exploreUrl.startsWith("https://")) {
      a.href = exploreUrl;
    } else {
      a.href = `http://localhost:3000${rawCanonical}`;
    }
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.setAttribute("title", "Explore Argumentation Stance Matrix on Ithaca");

    // Inner badge card
    const inner = document.createElement("div");
    inner.className = "ithaca-badge-inner";

    // Logo
    const logo = document.createElement("span");
    logo.className = "ithaca-brand-logo";
    logo.textContent = "🏛️ Ithaca";
    inner.appendChild(logo);

    // Version Tag (e.g. v2 on arXiv)
    const activeVersion = queryMeta?.version || data.queryVersion;
    if (activeVersion) {
      const vTag = document.createElement("span");
      vTag.className = "ithaca-version-tag";
      vTag.textContent = activeVersion;
      vTag.setAttribute(
        "title",
        `Version-specific stance tracking (${activeVersion})`,
      );
      inner.appendChild(vTag);
    }

    // Sovereign Archive Tag
    if (isSovereign) {
      const sov = document.createElement("span");
      sov.className = "ithaca-sovereign-tag";
      sov.textContent = `🏛️ ${data.institutionName || "Verified Archive"}`;
      inner.appendChild(sov);
    }

    // Stance pill group
    const pillGroup = document.createElement("div");
    pillGroup.className = "ithaca-stance-pill-group";

    const pSupport = createPill(
      "support",
      "dot-green",
      data.supports || 0,
      "Supporting Citations",
    );
    const pContradict = createPill(
      "contradict",
      "dot-red",
      data.contradicts || 0,
      "Contradicting / Disputing Citations",
    );

    // Highlight critical dispute severity if peer rebuttals exist
    if (data.disputeSeverity === "critical") {
      pContradict.classList.add("ithaca-dispute-alert");
      pContradict.setAttribute(
        "title",
        `${data.contradicts} Disputing Citations (⚠️ Verified Critical Counter-Evidence)`,
      );
    }

    const pExtend = createPill(
      "extend",
      "dot-purple",
      data.extends || 0,
      "Methodological Extensions",
    );

    pillGroup.append(pSupport, pContradict, pExtend);
    inner.appendChild(pillGroup);

    // CTA
    const cta = document.createElement("span");
    cta.className = "ithaca-badge-cta";
    cta.textContent = "Explore Graph →";
    inner.appendChild(cta);

    // Bi-directional Scholarly Contribution CTA (+ Stance)
    const effectiveDoi = data.doi || queryMeta?.doi;
    const effectiveTitle = data.title || queryMeta?.title;
    const contributeBtn = document.createElement("a");
    contributeBtn.className = "ithaca-badge-contribute";
    let curateUrl = `${canonicalBase || "http://localhost:3000"}/explore?action=curate&mode=stance`;
    if (effectiveDoi) curateUrl += `&doi=${encodeURIComponent(effectiveDoi)}`;
    if (effectiveTitle)
      curateUrl += `&title=${encodeURIComponent(effectiveTitle)}`;
    if (activeVersion)
      curateUrl += `&version=${encodeURIComponent(activeVersion)}`;
    contributeBtn.href = curateUrl;
    contributeBtn.target = "_blank";
    contributeBtn.rel = "noopener noreferrer";
    contributeBtn.setAttribute(
      "title",
      "Contribute a Stance, Dispute, or Replication finding directly to Ithaca",
    );
    contributeBtn.textContent = "+ Stance";
    inner.appendChild(contributeBtn);

    a.appendChild(inner);
    container.appendChild(a);

    // Dispute Popover Preview
    if (data.topDisputeSnippet && (data.contradicts || 0) > 0) {
      const popover = document.createElement("div");
      popover.className = "ithaca-dispute-popover";

      const popHeader = document.createElement("div");
      popHeader.className = "ithaca-popover-header";
      popHeader.textContent = "⚠️ Top Disputed Finding";

      const popQuote = document.createElement("span");
      popQuote.className = "ithaca-popover-quote";
      popQuote.textContent = `"${data.topDisputeSnippet}"`;

      popover.append(popHeader, popQuote);
      container.appendChild(popover);

      // Hover triggers on the Contradict pill
      pContradict.addEventListener("mouseenter", () =>
        popover.classList.add("active"),
      );
      pContradict.addEventListener("mouseleave", () =>
        popover.classList.remove("active"),
      );
      container.addEventListener("mouseleave", () =>
        popover.classList.remove("active"),
      );
    }

    shadow.appendChild(container);
    document.body.appendChild(host);
  }

  let retryCount = 0;
  const RETRY_DELAYS = [600, 1500, 3000];

  function runLifecycle() {
    const meta = extractPaperMetadata();
    if (!meta.doi && !meta.title) {
      // Bounded retry backoff for SPA hydration (Elsevier / Springer / Wiley)
      if (retryCount < RETRY_DELAYS.length) {
        const delay = RETRY_DELAYS[retryCount++];
        setTimeout(runLifecycle, delay);
      }
      return;
    }

    if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
        if (message.type === "GET_PAGE_METADATA") {
          sendResponse(meta);
        }
      });
    }

    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(
        {
          type: "GET_BADGE",
          doi: meta.doi,
          title: meta.title,
          version: meta.version,
        },
        (response) => {
          if (response && response.success && response.data) {
            injectBadge(response.data, response.apiBase, meta);
          }
        },
      );
    } else {
      // Direct fetch fallback in test/mock environments
      const fallbackBase =
        window.location.hostname === "localhost"
          ? "http://localhost:3000"
          : "https://ithaca.tech";
      const params = new URLSearchParams();
      if (meta.doi) params.set("doi", meta.doi);
      if (meta.title) params.set("title", meta.title);
      if (meta.version) params.set("version", meta.version);
      fetch(`${fallbackBase}/api/research/extension-badge?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => injectBadge(data, fallbackBase, meta))
        .catch(() => {});
    }
  }

  // Export for Node/test environments
  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      extractPaperMetadata,
      extractJsonLd,
      injectBadge,
      createPill,
      runLifecycle,
      ROOT_ID,
    };
  }

  // Initial load
  if (typeof window !== "undefined" && !window.__ITHACA_TEST_ENV__) {
    runLifecycle();

    // Lightweight SPA navigation observer
    let currentHref =
      typeof window !== "undefined" && window.location
        ? window.location.href
        : "";
    if (
      typeof MutationObserver !== "undefined" &&
      typeof document !== "undefined"
    ) {
      const observer = new MutationObserver(() => {
        if (
          typeof window !== "undefined" &&
          window.location &&
          window.location.href !== currentHref
        ) {
          currentHref = window.location.href;
          retryCount = 0;
          runLifecycle();
        }
      });
      observer.observe(document, { subtree: true, childList: true });
    }
  }
})();
