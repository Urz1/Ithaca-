// Ithaca Extension - Service Worker (Manifest V3)
const DEFAULT_API_BASE = "http://localhost:3000";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CACHE_ENTRIES = 200;
const PRUNE_BATCH_SIZE = 40; // Evict 20% oldest items upon reaching capacity

// In-memory fallback for testing / non-extension runtimes
const memoryCache = new Map();

// In-flight request coalescing to deduplicate concurrent requests (e.g. multi-tab storming)
const inFlightRequests = new Map();

async function getStorageSession() {
  if (typeof chrome !== "undefined" && chrome.storage?.session) {
    return chrome.storage.session;
  }
  return null;
}

async function pruneSessionCache(session, countToPrune) {
  try {
    const res = await session.get(["badge:_lru_index"]);
    const index = Array.isArray(res["badge:_lru_index"])
      ? res["badge:_lru_index"]
      : [];
    if (index.length === 0) return;

    const toRemove = index.slice(0, countToPrune);
    const remaining = index.slice(countToPrune);
    await session.remove(toRemove);
    await session.set({ "badge:_lru_index": remaining });
  } catch (err) {
    console.warn("[Ithaca Extension] Failed to prune session storage:", err);
  }
}

async function getCachedBadge(cacheKey) {
  const session = await getStorageSession();
  const storageKey = `badge:${cacheKey}`;

  if (session) {
    try {
      const result = await session.get([storageKey, "badge:_lru_index"]);
      const item = result[storageKey];
      if (item && Date.now() - item.timestamp < CACHE_TTL_MS) {
        // Refresh LRU order on hit
        let index = Array.isArray(result["badge:_lru_index"])
          ? result["badge:_lru_index"]
          : [];
        index = index.filter((k) => k !== storageKey);
        index.push(storageKey);
        session.set({ "badge:_lru_index": index }).catch(() => {});
        return item;
      }
    } catch {
      // Fall through to memoryCache
    }
  }

  const memItem = memoryCache.get(cacheKey);
  if (memItem && Date.now() - memItem.timestamp < CACHE_TTL_MS) {
    // Refresh memory LRU order
    memoryCache.delete(cacheKey);
    memoryCache.set(cacheKey, memItem);
    return memItem;
  }

  return null;
}

async function setCachedBadge(cacheKey, data, apiBase) {
  const session = await getStorageSession();
  const entry = { timestamp: Date.now(), data, apiBase };
  const storageKey = `badge:${cacheKey}`;

  if (session) {
    try {
      const res = await session.get(["badge:_lru_index"]);
      let index = Array.isArray(res["badge:_lru_index"])
        ? res["badge:_lru_index"]
        : [];
      index = index.filter((k) => k !== storageKey);

      if (index.length >= MAX_CACHE_ENTRIES) {
        const toPrune = index.splice(0, PRUNE_BATCH_SIZE);
        await session.remove(toPrune);
      }

      index.push(storageKey);
      await session.set({
        [storageKey]: entry,
        "badge:_lru_index": index,
      });
    } catch (quotaErr) {
      // Quota exceeded: aggressively prune oldest 50% and retry
      try {
        const res = await session.get(["badge:_lru_index"]);
        let index = Array.isArray(res["badge:_lru_index"])
          ? res["badge:_lru_index"]
          : [];
        const pruneCount = Math.max(10, Math.floor(index.length / 2));
        const toPrune = index.splice(0, pruneCount);
        await session.remove(toPrune);
        index.push(storageKey);
        await session.set({
          [storageKey]: entry,
          "badge:_lru_index": index,
        });
      } catch {
        // Fallback silently if session storage remains full
      }
    }
  }

  // Memory LRU maintenance
  if (memoryCache.has(cacheKey)) {
    memoryCache.delete(cacheKey);
  } else if (memoryCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(cacheKey, entry);
}

async function getApiBase() {
  return new Promise((resolve) => {
    if (typeof chrome !== "undefined" && chrome.storage?.sync) {
      chrome.storage.sync.get({ apiBase: DEFAULT_API_BASE }, (items) => {
        resolve(items.apiBase || DEFAULT_API_BASE);
      });
    } else {
      resolve(DEFAULT_API_BASE);
    }
  });
}

async function getActiveBase(preferredBase) {
  const session = await getStorageSession();
  if (session) {
    try {
      const res = await session.get(["activeApiBase"]);
      if (res.activeApiBase) return res.activeApiBase;
    } catch {
      // Ignore
    }
  }
  return preferredBase;
}

async function setActiveBase(base) {
  const session = await getStorageSession();
  if (session) {
    try {
      await session.set({ activeApiBase: base });
    } catch {
      // Ignore
    }
  }
}

async function probeEndpoint(base, doi, title, version, timeoutMs = 2000) {
  const url = new URL("/api/research/extension-badge", base);
  if (doi) url.searchParams.set("doi", doi);
  if (title) url.searchParams.set("title", title);
  if (version) url.searchParams.set("version", version);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
      },
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return { base, data };
    }
    throw new Error(`HTTP ${response.status} from ${base}`);
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

async function fetchBadgeData(doi, title, version = null) {
  const cacheKey = `${(doi || title || "").toLowerCase()}${version ? `:${version.toLowerCase()}` : ""}`;
  const cached = await getCachedBadge(cacheKey);
  if (cached) {
    return cached.data;
  }

  // Single-flight coalescing: return existing inflight promise if duplicate request is active
  if (inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const executeFetch = async () => {
    const preferredBase = await getApiBase();
    const activeBase = await getActiveBase(preferredBase);

    // 1. Try active / preferred base first
    try {
      const result = await probeEndpoint(activeBase, doi, title, version, 2500);
      await setCachedBadge(cacheKey, result.data, result.base);
      return result.data;
    } catch {
      // 2. Fast concurrent race across alternative candidate bases
      const candidates = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://ithaca.tech",
      ].filter((b) => b !== activeBase);

      try {
        const winning = await Promise.any(
          candidates.map((candidate) =>
            probeEndpoint(candidate, doi, title, version, 2000),
          ),
        );
        await setActiveBase(winning.base);
        await setCachedBadge(cacheKey, winning.data, winning.base);
        return winning.data;
      } catch {
        throw new Error(
          `Failed to reach Ithaca API at ${activeBase} and candidate fallback endpoints.`,
        );
      }
    }
  };

  const promise = executeFetch().finally(() => {
    inFlightRequests.delete(cacheKey);
  });

  inFlightRequests.set(cacheKey, promise);
  return await promise;
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === "GET_BADGE") {
      getApiBase().then(async (preferredBase) => {
        try {
          const data = await fetchBadgeData(
            message.doi,
            message.title,
            message.version,
          );
          const cacheKey = `${(message.doi || message.title || "").toLowerCase()}${message.version ? `:${message.version.toLowerCase()}` : ""}`;
          const cached = await getCachedBadge(cacheKey);
          const apiBase = cached?.apiBase || preferredBase || DEFAULT_API_BASE;
          sendResponse({ success: true, data, apiBase });
        } catch (err) {
          sendResponse({ success: false, error: err.message });
        }
      });
      return true; // Keep message channel open for async response
    }
  });
}

// Export for Node/testing environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    fetchBadgeData,
    memoryCache,
    inFlightRequests,
    MAX_CACHE_ENTRIES,
    PRUNE_BATCH_SIZE,
    pruneSessionCache,
    DEFAULT_API_BASE,
    getCachedBadge,
    setCachedBadge,
  };
}
