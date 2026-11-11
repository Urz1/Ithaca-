// Ithaca Extension Popup Logic
document.addEventListener("DOMContentLoaded", async () => {
  const titleEl = document.getElementById("paper-title");
  const supportEl = document.getElementById("count-support");
  const contradictEl = document.getElementById("count-contradict");
  const extendEl = document.getElementById("count-extend");
  const sovereignEl = document.getElementById("badge-sovereign");
  const versionEl = document.getElementById("badge-version");
  const disputeSeverityAlert = document.getElementById(
    "dispute-severity-alert",
  );
  const exploreBtn = document.getElementById("btn-explore");
  const contributeBtn = document.getElementById("btn-contribute");
  const btnSettings = document.getElementById("btn-settings");
  const disputeCard = document.getElementById("dispute-preview-card");
  const disputeQuote = document.getElementById("dispute-quote");

  if (btnSettings) {
    btnSettings.addEventListener("click", () => {
      if (typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else if (typeof chrome !== "undefined" && chrome.runtime?.getURL) {
        window.open(chrome.runtime.getURL("options.html"));
      }
    });
  }

  if (typeof chrome === "undefined" || !chrome.tabs) {
    titleEl.textContent = "Ithaca Active Tab Inspector";
    return;
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    titleEl.textContent = "No active academic article detected.";
    return;
  }

  function parseAcademicUrl(url) {
    // arXiv (abstract or PDF, including revision suffixes like v1, v2)
    const arxivMatch = url.match(
      /arxiv\.org\/(?:abs|pdf)\/([0-9]+\.[0-9]+)(?:v([0-9]+))?(?:\.pdf)?/i,
    );
    if (arxivMatch) {
      return {
        doi: `10.48550/arXiv.${arxivMatch[1]}`,
        title: null,
        version: arxivMatch[2] ? `v${arxivMatch[2]}` : null,
      };
    }

    // Nature articles
    const natureMatch = url.match(/nature\.com\/articles\/([a-zA-Z0-9._-]+)/i);
    if (natureMatch) {
      return { doi: `10.1038/${natureMatch[1]}`, title: null, version: null };
    }

    // Google Scholar query fallback (passive single-query parsing)
    if (url.includes("scholar.google")) {
      const qMatch = url.match(/[?&]q=([^&]+)/);
      if (qMatch) {
        return {
          doi: null,
          title: decodeURIComponent(qMatch[1].replace(/\+/g, " ")),
          version: null,
        };
      }
    }

    return null;
  }

  // Query background worker for current tab paper data
  chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_METADATA" }, (meta) => {
    if (chrome.runtime.lastError || !meta) {
      // Direct URL fallback (handles arXiv PDFs, Nature, etc.)
      const parsed = parseAcademicUrl(tab.url);
      if (parsed && (parsed.doi || parsed.title)) {
        fetchBadge(parsed.doi, parsed.title, parsed.version);
      } else {
        titleEl.textContent =
          "Navigate to an arXiv, PubMed, or Nature article to view stances.";
      }
      return;
    }
    fetchBadge(meta.doi, meta.title, meta.version);
  });

  function fetchBadge(doi, title, version) {
    chrome.runtime.sendMessage(
      { type: "GET_BADGE", doi, title, version },
      (response) => {
        if (!response || !response.success || !response.data) {
          if (response?.error) {
            titleEl.textContent = `Backend connection error (${response.error}). Ensure local server is running on localhost:3000.`;
          } else {
            titleEl.textContent = "No debate recorded yet for this paper.";
          }
          return;
        }

        const data = response.data;
        titleEl.textContent = data.title || doi || "Academic Article";
        supportEl.textContent = data.supports || 0;
        contradictEl.textContent = data.contradicts || 0;
        extendEl.textContent = data.extends || 0;

        const effectiveVersion = version || data.queryVersion;
        if (versionEl && effectiveVersion) {
          versionEl.textContent = effectiveVersion;
          versionEl.style.display = "inline-block";
        }

        if (sovereignEl && data.isSovereignIndex) {
          sovereignEl.style.display = "inline-block";
        }

        if (disputeSeverityAlert) {
          if (data.disputeSeverity === "critical") {
            disputeSeverityAlert.style.display = "block";
          } else {
            disputeSeverityAlert.style.display = "none";
          }
        }

        if (disputeCard && disputeQuote) {
          if (data.topDisputeSnippet && (data.contradicts || 0) > 0) {
            disputeQuote.textContent = `"${data.topDisputeSnippet}"`;
            disputeCard.style.display = "block";
          } else {
            disputeCard.style.display = "none";
          }
        }

        const apiBase = response.apiBase || "http://localhost:3000";
        if (exploreBtn && data.canonicalUrl) {
          const fullUrl = data.canonicalUrl.startsWith("http")
            ? data.canonicalUrl
            : `${apiBase}${data.canonicalUrl}`;
          exploreBtn.href = fullUrl;
        }

        if (contributeBtn) {
          const targetDoi = data.doi || doi || "";
          const targetTitle = data.title || title || "";
          let curateUrl = `${apiBase}/explore?action=curate&mode=stance`;
          if (targetDoi) curateUrl += `&doi=${encodeURIComponent(targetDoi)}`;
          if (targetTitle)
            curateUrl += `&title=${encodeURIComponent(targetTitle)}`;
          if (effectiveVersion)
            curateUrl += `&version=${encodeURIComponent(effectiveVersion)}`;
          contributeBtn.href = curateUrl;
          contributeBtn.style.display = "block";
        }
      },
    );
  }
});
