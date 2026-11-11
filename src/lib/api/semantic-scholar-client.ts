/**
 * Semantic Scholar API Client
 *
 * Fetches citation context sentences and intent labels from S2's Graph API.
 * These provide the actual in-text sentences where a citing paper references
 * a cited paper — far more informative than abstracts alone.
 *
 * API docs: https://api.semanticscholar.org/api-docs/graph
 *
 * Rate limits:
 *   - Without API key: 1 request/second
 *   - With API key: 10 requests/second (apply at https://www.semanticscholar.org/product/api)
 *
 * Environment:
 *   - SEMANTIC_SCHOLAR_API_KEY (optional) — increases rate limits
 */

// =============================================================================
// TYPES
// =============================================================================

/** A single citation relationship with context from S2 */
interface S2CitationContext {
  /** S2 paper ID of the other paper in the relationship */
  paperId: string;
  /** DOI of the other paper (if available) */
  doi?: string;
  /** External IDs for cross-referencing with OpenAlex */
  externalIds?: {
    DOI?: string;
    OpenAlexId?: string;
    [key: string]: string | undefined;
  };
  /** Actual sentences from the citing paper's full text where the citation appears */
  contexts: string[];
  /** S2 intent classification: "Background", "Methodology", "ResultComparison" */
  intents: string[];
  /** Whether S2 considers this a highly influential citation */
  isInfluential: boolean;
  /** Title of the other paper for debugging */
  title?: string;
}

/** Raw S2 API citation/reference edge */
interface S2RawCitationEdge {
  citingPaper?: S2RawPaper;
  citedPaper?: S2RawPaper;
  contexts?: string[];
  intents?: string[];
  isInfluential?: boolean;
}

interface S2RawPaper {
  paperId: string;
  externalIds?: {
    DOI?: string;
    OpenAlexId?: string;
    [key: string]: string | undefined;
  };
  title?: string;
}

// =============================================================================
// RATE LIMITER
// =============================================================================

class S2RateLimiter {
  private lastRequestTime = 0;
  private readonly minInterval: number;

  constructor(hasApiKey: boolean) {
    // S2 rate limit: 1 req/sec without key, 10 req/sec with key
    // Add 50ms buffer to stay safely under the limit
    this.minInterval = hasApiKey ? 150 : 1050;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < this.minInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minInterval - elapsed),
      );
    }
    this.lastRequestTime = Date.now();
  }
}

// =============================================================================
// CLIENT
// =============================================================================

const S2_BASE_URL = "https://api.semanticscholar.org/graph/v1";
const CITATION_FIELDS = "contexts,intents,isInfluential";
const PAPER_FIELDS_IN_CITATION = "paperId,externalIds,title";

let rateLimiter: S2RateLimiter | null = null;

function getRateLimiter(): S2RateLimiter {
  if (!rateLimiter) {
    rateLimiter = new S2RateLimiter(!!getApiKey());
  }
  return rateLimiter;
}

// =============================================================================
// IN-MEMORY S2 REFERENCE CACHE
// =============================================================================

/**
 * Module-level cache for S2 reference lookups.
 * Key: cleaned citing DOI
 * Value: the full array of S2CitationContext for that citing paper's references
 *
 * Persists for the lifetime of the server process (cleared on restart).
 * Prevents re-fetching the same citing paper's references across multiple
 * graph loads / edge-classification calls within the same session.
 */
export const s2ReferenceCache = new Map<string, S2CitationContext[]>();

function getApiKey(): string | undefined {
  return process.env.SEMANTIC_SCHOLAR_API_KEY;
}

function buildHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: "application/json",
  };
  const apiKey = getApiKey();
  if (apiKey) {
    headers["x-api-key"] = apiKey;
  }
  return headers;
}

/**
 * Fetch citation contexts for papers that the given paper REFERENCES.
 * Returns the in-text sentences and intent labels.
 *
 * @param doi - The DOI of the citing paper
 * @param limit - Max number of referenced papers to return (default 500)
 */
export async function getS2ReferenceContexts(
  doi: string,
  limit = 500,
): Promise<{ references: S2CitationContext[]; isSuccess: boolean }> {
  const cleanDoi = cleanDOI(doi);
  if (!cleanDoi) return { references: [], isSuccess: false };

  if (s2ReferenceCache.has(cleanDoi)) {
    return { references: s2ReferenceCache.get(cleanDoi)!, isSuccess: true };
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await getRateLimiter().wait();

      const url = `${S2_BASE_URL}/paper/DOI:${cleanDoi}/references?fields=${CITATION_FIELDS},${PAPER_FIELDS_IN_CITATION}&limit=${limit}`;

      const response = await fetch(url, {
        headers: buildHeaders(),
        signal: AbortSignal.timeout(10_000),
      });

      if (response.status === 429) {
        if (attempt < 2) {
          const delay = (attempt + 1) * 1500 + Math.random() * 500;
          console.warn(
            `[S2] 429 received for DOI:${cleanDoi}, backing off ${Math.round(delay)}ms (attempt ${attempt + 1}/3)...`,
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        console.warn(`[S2] Rate limited after retries for DOI:${cleanDoi}`);
        return { references: [], isSuccess: false };
      }

      if (!response.ok) {
        if (response.status === 404) {
          console.warn(`[S2] Paper not found: DOI:${cleanDoi}`);
          return { references: [], isSuccess: true };
        }
        console.warn(`[S2] References API returned ${response.status}`);
        return { references: [], isSuccess: false };
      }

      const data = (await response.json()) as { data: S2RawCitationEdge[] };

      const references = (data.data || [])
        .filter((edge) => edge.citedPaper?.paperId)
        .map((edge) => ({
          paperId: edge.citedPaper!.paperId,
          doi: edge.citedPaper?.externalIds?.DOI,
          externalIds: edge.citedPaper?.externalIds,
          contexts: edge.contexts || [],
          intents: edge.intents || [],
          isInfluential: edge.isInfluential || false,
          title: edge.citedPaper?.title,
        }));

      s2ReferenceCache.set(cleanDoi, references);
      return { references, isSuccess: true };
    } catch (error) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.warn(`[S2] Error fetching references for DOI:${cleanDoi}:`, error);
      return { references: [], isSuccess: false };
    }
  }

  return { references: [], isSuccess: false };
}

/**
 * Single-query lookup: Fetches in-text citation contexts directly from the TARGET paper's
 * incoming citations endpoint.
 *
 * This turns 20 sequential requests (21+ seconds) into a SINGLE request (<0.6s)
 * that stays safely under the 1 req/sec rate limit.
 */
export async function getTargetCitationContexts(
  targetDoi: string,
  limit = 100,
): Promise<Map<string, { contexts: string[]; intents: string[] }>> {
  const cleanTarget = cleanDOI(targetDoi);
  if (!cleanTarget) return new Map();

  const resultMap = new Map<string, { contexts: string[]; intents: string[] }>();

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await getRateLimiter().wait();

      const url = `${S2_BASE_URL}/paper/DOI:${cleanTarget}/citations?fields=${CITATION_FIELDS},citingPaper.paperId,citingPaper.externalIds,citingPaper.title&limit=${limit}`;

      const response = await fetch(url, {
        headers: buildHeaders(),
        signal: AbortSignal.timeout(12_000),
      });

      if (response.status === 429) {
        if (attempt < 2) {
          const delay = (attempt + 1) * 1500 + Math.random() * 500;
          console.warn(
            `[S2 target citations] Rate limited on target DOI:${cleanTarget}, backing off ${Math.round(delay)}ms...`,
          );
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        console.warn("[S2 target citations] Rate limited after retries");
        return resultMap;
      }

      if (!response.ok) {
        console.warn(
          `[S2 target citations] Returned status ${response.status} for DOI:${cleanTarget}`,
        );
        return resultMap;
      }

      const json = (await response.json()) as {
        data: Array<{
          contexts?: string[];
          intents?: string[];
          citingPaper?: {
            paperId?: string;
            title?: string;
            externalIds?: { DOI?: string; CorpusId?: number; ArXiv?: string };
          };
        }>;
      };

      if (!json.data || !Array.isArray(json.data)) return resultMap;

      for (const item of json.data) {
        const contexts = item.contexts || [];
        const intents = item.intents || [];
        const citingDoi = item.citingPaper?.externalIds?.DOI;

        if (contexts.length > 0 || intents.length > 0) {
          const payload = { contexts, intents };
          if (citingDoi) {
            const clean = cleanDOI(citingDoi);
            if (clean) resultMap.set(clean.toLowerCase(), payload);
          }
          if (item.citingPaper?.title) {
            // Also index by normalized title for DOI-less matches
            resultMap.set(
              `title:${normalizeTitle(item.citingPaper.title)}`,
              payload,
            );
          }
        }
      }

      console.log(
        `[S2 target citations] Retrieved in-text contexts for ${resultMap.size} citing papers in 1 request!`,
      );
      return resultMap;
    } catch (err) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000));
        continue;
      }
      console.warn("[S2 target citations] Request failed:", err);
      return resultMap;
    }
  }

  return resultMap;
}

/**
 * Batch-fetch citation contexts for multiple citing papers.
 * Prioritizes a single inverse lookup on the target paper's citations (1 HTTP call, <0.6s),
 * falling back to individual citing paper reference queries only when necessary.
 *
 * @param pairs - Array of { citingDoi, citedDoi, citingId, citedId, citingTitle }
 * @param options - Optional targetDoi override
 * @returns Map from "citingId→citedId" to { contexts, intents }
 */
export async function batchGetCitationContexts(
  pairs: {
    citingDoi?: string;
    citedDoi?: string;
    citingId: string;
    citedId: string;
    citingTitle?: string;
  }[],
  options?: { targetDoi?: string },
): Promise<Map<string, { contexts: string[]; intents: string[] }>> {
  const result = new Map<string, { contexts: string[]; intents: string[] }>();
  if (pairs.length === 0) return result;

  // 1. Identify candidate target DOIs with incoming citations
  const candidateTargetDois = new Set<string>();
  if (options?.targetDoi) {
    const clean = cleanDOI(options.targetDoi);
    if (clean) candidateTargetDois.add(clean);
  }

  // Count target DOIs across pairs to find heavily cited targets
  const citedDoiCounts = new Map<string, number>();
  for (const pair of pairs) {
    if (pair.citedDoi) {
      const clean = cleanDOI(pair.citedDoi);
      if (clean) {
        citedDoiCounts.set(clean, (citedDoiCounts.get(clean) || 0) + 1);
      }
    }
  }

  // Add target DOIs cited by multiple pairs, or the single target if all share it
  for (const [doi, count] of citedDoiCounts.entries()) {
    if (count >= 2 || citedDoiCounts.size === 1) {
      candidateTargetDois.add(doi);
    }
  }

  // 2. Breakthrough: Execute High-Speed Inverse Target Citations Query First
  const targetsToQuery = Array.from(candidateTargetDois).slice(0, 2);
  for (const targetDoi of targetsToQuery) {
    try {
      const targetCitations = await getTargetCitationContexts(targetDoi, 100);
      if (targetCitations.size === 0) continue;

      for (const pair of pairs) {
        if (pair.citedDoi && cleanDOI(pair.citedDoi) !== cleanDOI(targetDoi)) {
          continue; // pair is citing a different paper
        }

        const key = `${pair.citingId}→${pair.citedId}`;
        if (result.has(key)) continue;

        let matched = false;

        if (pair.citingDoi) {
          const clean = cleanDOI(pair.citingDoi);
          if (clean && targetCitations.has(clean.toLowerCase())) {
            result.set(key, targetCitations.get(clean.toLowerCase())!);
            matched = true;
          }
        }

        if (!matched && pair.citingTitle) {
          const titleKey = `title:${normalizeTitle(pair.citingTitle)}`;
          if (targetCitations.has(titleKey)) {
            result.set(key, targetCitations.get(titleKey)!);
            matched = true;
          }
        }
      }

      console.log(
        `[S2] Inverse target citations query for DOI:${targetDoi} matched ${result.size}/${pairs.length} pairs in 1 request!`,
      );
    } catch (err) {
      console.warn(
        `[S2] Inverse target query failed for ${targetDoi}, falling back:`,
        err,
      );
    }
  }

  // 3. Fallback: Group remaining unmatched pairs by citing DOI
  const remainingPairs = pairs.filter(
    (p) => !result.has(`${p.citingId}→${p.citedId}`),
  );

  if (remainingPairs.length === 0) {
    return result;
  }

  const byCitingDoi = new Map<
    string,
    { citedDoi: string; citingId: string; citedId: string }[]
  >();

  for (const pair of remainingPairs) {
    if (!pair.citingDoi || !pair.citedDoi) continue;

    const cleanCiting = cleanDOI(pair.citingDoi);
    if (!cleanCiting) continue;

    const existing = byCitingDoi.get(cleanCiting) || [];
    existing.push({
      citedDoi: pair.citedDoi,
      citingId: pair.citingId,
      citedId: pair.citedId,
    });
    byCitingDoi.set(cleanCiting, existing);
  }

  if (byCitingDoi.size > 0) {
    const cachedEntries: [
      string,
      { citedDoi: string; citingId: string; citedId: string }[],
    ][] = [];
    const uncachedEntries: [
      string,
      { citedDoi: string; citingId: string; citedId: string }[],
    ][] = [];

    for (const entry of byCitingDoi.entries()) {
      if (s2ReferenceCache.has(entry[0])) {
        cachedEntries.push(entry);
      } else {
        uncachedEntries.push(entry);
      }
    }

    // Process all cached entries (0ms latency), plus at most 3 uncached entries
    const toProcess = [...cachedEntries, ...uncachedEntries.slice(0, 3)];

    console.log(
      `[S2] Running fallback reference lookups for ${toProcess.length} citing papers (${cachedEntries.length} cached, ${Math.min(uncachedEntries.length, 3)} uncached)`,
    );

    for (const [citingDoi, targets] of toProcess) {
      try {
        let references: S2CitationContext[];
        if (s2ReferenceCache.has(citingDoi)) {
          references = s2ReferenceCache.get(citingDoi)!;
        } else {
          const res = await getS2ReferenceContexts(citingDoi);
          references = res.references;
          // Never cache poison on failures
          if (res.isSuccess) {
            s2ReferenceCache.set(citingDoi, references);
          }
        }

        const refByDoi = new Map<
          string,
          { contexts: string[]; intents: string[] }
        >();
        for (const ref of references) {
          const refDoi = cleanDOI(ref.doi || "");
          if (refDoi && (ref.contexts.length > 0 || ref.intents.length > 0)) {
            refByDoi.set(refDoi.toLowerCase(), {
              contexts: ref.contexts,
              intents: ref.intents,
            });
          }
        }

        for (const target of targets) {
          const cleanCited = cleanDOI(target.citedDoi);
          if (!cleanCited) continue;

          const match = refByDoi.get(cleanCited.toLowerCase());
          if (match) {
            const key = `${target.citingId}→${target.citedId}`;
            result.set(key, match);
          }
        }
      } catch (error) {
        console.warn(
          `[S2] Fallback error for DOI:${citingDoi}:`,
          error,
        );
      }
    }
  }

  console.log(
    `[S2] Total citation contexts retrieved: ${result.size}/${pairs.length} pairs`,
  );

  return result;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Clean a DOI string by removing URL prefixes and whitespace.
 * "https://doi.org/10.1234/foo" → "10.1234/foo"
 */
export function cleanDOI(doi: string): string | null {
  if (!doi) return null;

  let cleaned = doi.trim();

  // Remove common URL prefixes
  cleaned = cleaned.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "");
  cleaned = cleaned.replace(/^doi:\s*/i, "");

  // Basic DOI format validation: starts with "10."
  if (!cleaned.toLowerCase().startsWith("10.")) return null;

  return cleaned.toLowerCase();
}

/**
 * Normalize a paper title for fuzzy lookup.
 */
export function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}
