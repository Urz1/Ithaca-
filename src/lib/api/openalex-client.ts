/**
 * OpenAlex API Client
 *
 * Low-level fetch wrapper for the OpenAlex REST API.
 * Handles rate limiting, retries, polite-pool headers, and abstract reconstruction.
 *
 * Docs: https://docs.openalex.org
 * Rate limits:
 *   - Without email: ~1 req/sec (common pool)
 *   - With email in User-Agent: ~10 req/sec (polite pool)
 */

import type {
  OpenAlexWork,
  OpenAlexListResponse,
  OpenAlexAutocompleteResponse,
} from "./openalex-types";

// =============================================================================
// CONFIGURATION
// =============================================================================

const OPENALEX_BASE = "https://api.openalex.org";

/** Fields we request for works — keeps response size manageable */
const WORK_FIELDS = [
  "id",
  "doi",
  "title",
  "display_name",
  "publication_year",
  "publication_date",
  "type",
  "cited_by_count",
  "cited_by_api_url",
  "referenced_works",
  "related_works",
  "authorships",
  "primary_location",
  "concepts",
  "topics",
  "abstract_inverted_index",
  "open_access",
  "ids",
  "biblio",
].join(",");

/** Shorter field set for search results / lists where we don't need everything */
const SEARCH_FIELDS = [
  "id",
  "title",
  "display_name",
  "publication_year",
  "cited_by_count",
  "authorships",
  "primary_location",
  "concepts",
  "abstract_inverted_index",
  "referenced_works",
  "open_access",
  "ids",
  "type",
].join(",");

// =============================================================================
// RATE LIMITER
// =============================================================================

class SimpleRateLimiter {
  private lastRequest = 0;
  private minInterval: number; // ms between requests

  constructor(requestsPerSecond: number) {
    this.minInterval = 1000 / requestsPerSecond;
  }

  async wait(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequest;
    if (elapsed < this.minInterval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.minInterval - elapsed),
      );
    }
    this.lastRequest = Date.now();
  }
}

function getOpenAlexEmail(): string {
  return (
    process.env.NEXT_PUBLIC_OPENALEX_EMAIL ||
    process.env.OPENALEX_EMAIL ||
    "engineering@rhizan.com"
  );
}

// Polite pool (with email) = 10 rps, common pool = 1 rps
const rateLimiter = new SimpleRateLimiter(
  getOpenAlexEmail() ? 8 : 1, // Leave buffer below actual limits
);

// =============================================================================
// CORE FETCH
// =============================================================================

function getUserAgent(): string {
  const email = getOpenAlexEmail();
  if (email) {
    return `Ithaca/1.0 (mailto:${email})`;
  }
  return "Ithaca/1.0";
}

async function openAlexFetch<T>(
  path: string,
  params: Record<string, string> = {},
  retries = 2,
): Promise<T> {
  await rateLimiter.wait();

  const url = new URL(`${OPENALEX_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  // Always add mailto for polite pool
  const email = getOpenAlexEmail();
  if (email) {
    url.searchParams.set("mailto", email);
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url.toString(), {
        headers: {
          "User-Agent": getUserAgent(),
          Accept: "application/json",
        },
        // Next.js server-side fetch caching
        next: { revalidate: 3600 }, // Cache for 1 hour
      });

      if (response.status === 429) {
        // Rate limited — wait and retry
        const retryAfter = response.headers.get("retry-after");
        const rawWait = retryAfter ? parseInt(retryAfter, 10) * 1000 : 2000;
        // If wait is excessive (e.g. daily quota reset in hours), throw so we don't freeze the client thread indefinitely
        if (rawWait > 5000) {
          throw new Error(
            `OpenAlex rate limit exceeded (${Math.round(rawWait / 1000)}s retry-after).`,
          );
        }
        const waitMs = Math.min(Math.max(rawWait, 500), 5000);
        console.warn(
          `[OpenAlex] Rate limited, waiting ${waitMs}ms (attempt ${attempt + 1}/${retries + 1})`,
        );
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `OpenAlex API error (${response.status}): ${errorText.slice(0, 200)}`,
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (attempt === retries) throw error;
      // Wait before retry on network errors
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw new Error("[OpenAlex] All retries exhausted");
}

// =============================================================================
// API METHODS
// =============================================================================

/**
 * Search for works by text query.
 * Uses OpenAlex's full-text search which matches titles, abstracts, and full text.
 */
export async function searchWorks(
  query: string,
  options: {
    perPage?: number;
    page?: number;
    sort?: string;
    filter?: string;
  } = {},
): Promise<OpenAlexListResponse<OpenAlexWork>> {
  const params: Record<string, string> = {
    search: query,
    per_page: String(options.perPage ?? 25),
    page: String(options.page ?? 1),
    select: SEARCH_FIELDS,
  };

  if (options.sort) params.sort = options.sort;
  if (options.filter) params.filter = options.filter;

  return openAlexFetch<OpenAlexListResponse<OpenAlexWork>>("/works", params);
}

/**
 * Get a single work by its OpenAlex ID.
 * Accepts both short ("W2741809807") and full ("https://openalex.org/W2741809807") formats.
 */
export async function getWork(id: string): Promise<OpenAlexWork> {
  const cleanId = id.replace("https://openalex.org/", "");
  return openAlexFetch<OpenAlexWork>(`/works/${cleanId}`, {
    select: WORK_FIELDS,
  });
}

/**
 * Get multiple works by their OpenAlex IDs (batched).
 * Uses the filter API: filter=openalex:W123|W456|W789
 */
export async function getWorksBatch(
  ids: string[],
  perPage = 50,
): Promise<OpenAlexWork[]> {
  if (ids.length === 0) return [];

  // Clean IDs and cap at 50 per request (OpenAlex limit for OR filters)
  const cleanIds = ids
    .slice(0, perPage)
    .map((id) => id.replace("https://openalex.org/", ""));

  const filterValue = cleanIds.join("|");

  const response = await openAlexFetch<OpenAlexListResponse<OpenAlexWork>>(
    "/works",
    {
      filter: `openalex:${filterValue}`,
      per_page: String(perPage),
      select: SEARCH_FIELDS,
    },
  );

  return response.results;
}

/**
 * Get works that cite a given paper.
 */
export async function getCitingWorks(
  paperId: string,
  options: { perPage?: number; sort?: string } = {},
): Promise<OpenAlexListResponse<OpenAlexWork>> {
  const cleanId = paperId.replace("https://openalex.org/", "");

  return openAlexFetch<OpenAlexListResponse<OpenAlexWork>>("/works", {
    filter: `cites:${cleanId}`,
    per_page: String(options.perPage ?? 15),
    sort: options.sort ?? "cited_by_count:desc",
    select: SEARCH_FIELDS,
  });
}

/**
 * Multi-Strata Epistemic Sampling (MSES)
 * Fetches citing works across 3 balanced epistemic strata:
 * 1. Stratum 1A: Direct author-named rebuttals/critiques/comments (e.g. "Comment on Bem")
 * 2. Stratum 1B: Epistemic debate & replication keywords (replication, refute, fail, critique)
 * 3. Stratum 2: Top high-impact citing descendants (highest citation count)
 *
 * Merges and deduplicates while prioritizing direct controversy over generic methodology textbooks.
 */
export async function getDebateCitingWorks(
  paperId: string,
  options: {
    authorSurname?: string;
    limit?: number;
  } = {},
): Promise<OpenAlexWork[]> {
  const cleanId = paperId.replace("https://openalex.org/", "");
  const limit = options.limit ?? 20;

  // Clean and prepare author surname query if available
  const surname = options.authorSurname?.trim().replace(/[^a-zA-Z-]/g, "");

  try {
    const [namedCritiques, replicationDebates, topCiting] = await Promise.all([
      // Stratum 1A: Works citing this paper with author surname in title (e.g. "Comment on Bem")
      surname && surname.length > 2
        ? openAlexFetch<OpenAlexListResponse<OpenAlexWork>>("/works", {
            filter: `cites:${cleanId},title.search:${surname}`,
            per_page: "10",
            select: SEARCH_FIELDS,
          })
            .then((r) => r.results)
            .catch(() => [])
        : Promise.resolve([]),

      // Stratum 1B: Epistemic debate search (replication, refute, critique, comment, fail)
      // Anchored with target author surname when available to prevent cross-domain keyword bleed
      openAlexFetch<OpenAlexListResponse<OpenAlexWork>>("/works", {
        filter: `cites:${cleanId}`,
        search:
          surname && surname.length > 2
            ? `"${surname}" (replication OR replicate OR refute OR critique OR fail OR comment OR re-analysis)`
            : "replication OR replicate OR refute OR critique OR fail OR comment OR re-analysis",
        per_page: "12",
        select: SEARCH_FIELDS,
      })
        .then((r) => r.results)
        .catch(() => []),

      // Stratum 2: Top high-impact citing descendants (sorted by citation count)
      openAlexFetch<OpenAlexListResponse<OpenAlexWork>>("/works", {
        filter: `cites:${cleanId}`,
        per_page: "8",
        sort: "cited_by_count:desc",
        select: SEARCH_FIELDS,
      })
        .then((r) => r.results)
        .catch(() => []),
    ]);

    // Deduplicate and merge while preserving priority
    const seen = new Set<string>();
    const results: OpenAlexWork[] = [];

    // Stream 1: Named critiques (highest priority)
    for (const work of namedCritiques) {
      const id = work.id.replace("https://openalex.org/", "");
      if (!seen.has(id)) {
        seen.add(id);
        results.push(work);
      }
    }

    // Stream 2: Epistemic replication & debate works
    for (const work of replicationDebates) {
      const id = work.id.replace("https://openalex.org/", "");
      if (!seen.has(id)) {
        seen.add(id);
        results.push(work);
      }
    }

    // Stream 3: High-impact extensions (fill remaining slots up to limit)
    for (const work of topCiting) {
      const id = work.id.replace("https://openalex.org/", "");
      if (!seen.has(id)) {
        seen.add(id);
        results.push(work);
      }
    }

    // If all strata combined are still fewer than limit or if strata had no results,
    // fallback to standard citing works
    if (results.length === 0) {
      const fallback = await getCitingWorks(cleanId, { perPage: limit });
      return fallback.results;
    }

    return results.slice(0, limit);
  } catch (err) {
    console.warn("[OpenAlex] Error in getDebateCitingWorks, falling back:", err);
    const fallback = await getCitingWorks(cleanId, { perPage: limit });
    return fallback.results;
  }
}

/**
 * Get works that a given paper references (cited by this paper).
 * Fetches the referenced_works IDs from the paper, then batch-fetches them.
 */
export async function getReferencedWorks(
  paperId: string,
  limit = 15,
): Promise<OpenAlexWork[]> {
  // First get the paper to find its referenced_works
  const paper = await getWork(paperId);
  const refIds = paper.referenced_works.slice(0, limit);

  if (refIds.length === 0) return [];

  return getWorksBatch(refIds, limit);
}

/**
 * Autocomplete search (fast, for command bar / search-as-you-type).
 */
export async function autocompleteWorks(
  query: string,
): Promise<OpenAlexAutocompleteResponse> {
  return openAlexFetch<OpenAlexAutocompleteResponse>("/autocomplete/works", {
    q: query,
  });
}

/**
 * Autocomplete concepts/topics (for command bar topic search).
 * Returns fields of study matching the query.
 */
export async function autocompleteConcepts(
  query: string,
): Promise<OpenAlexAutocompleteResponse> {
  return openAlexFetch<OpenAlexAutocompleteResponse>("/autocomplete/concepts", {
    q: query,
  });
}

/**
 * Get works by concept/topic (for topic expansion).
 * Fetches the most-cited papers tagged with a given concept.
 */
export async function getWorksByConcept(
  conceptId: string,
  options: { perPage?: number; sort?: string } = {},
): Promise<OpenAlexListResponse<OpenAlexWork>> {
  const cleanId = conceptId.replace("https://openalex.org/", "");
  return openAlexFetch<OpenAlexListResponse<OpenAlexWork>>("/works", {
    filter: `concepts.id:${cleanId}`,
    per_page: String(options.perPage ?? 10),
    sort: options.sort ?? "cited_by_count:desc",
    select: SEARCH_FIELDS,
  });
}

// =============================================================================
// UTILITY: Abstract Reconstruction
// =============================================================================

/**
 * OpenAlex stores abstracts as inverted indexes for compression.
 * This reconstructs the full text.
 *
 * Input:  { "We": [0], "propose": [1], "a": [2, 5], "novel": [3], "method": [4, 6] }
 * Output: "We propose a novel method a method"
 */
export function reconstructAbstract(
  invertedIndex: Record<string, number[]> | null | undefined,
): string {
  if (!invertedIndex) return "";

  const words: [string, number][] = [];
  for (const [word, positions] of Object.entries(invertedIndex)) {
    for (const pos of positions) {
      words.push([word, pos]);
    }
  }

  return words
    .sort((a, b) => a[1] - b[1])
    .map((w) => w[0])
    .join(" ");
}
