import { importPapers } from "@/modules/papers/import-papers";
import type { ImportedPaper } from "@/modules/papers/types";
import { prisma } from "@/lib/prisma";

export interface ZoteroCreator {
  creatorType?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

export interface ZoteroItemData {
  key: string;
  version?: number;
  itemType: string;
  title?: string;
  creators?: ZoteroCreator[];
  publicationTitle?: string;
  date?: string;
  DOI?: string;
  url?: string;
  abstractNote?: string;
  dateModified?: string;
  extra?: string;
}

export interface ZoteroItem {
  key: string;
  version: number;
  data: ZoteroItemData;
}

export interface ConflictingStudyAlert {
  paperIdentifier: string;
  doi?: string;
  contradictingCount: number;
  disputes: Array<{
    citingId: string;
    snippet: string;
    confidence: number;
  }>;
}

export interface SyncZoteroResult {
  syncedItemCount: number;
  importedPapers: ImportedPaper[];
  conflictingStudies: ConflictingStudyAlert[];
  activeDisputeCount: number;
}

const ZOTERO_BASE_URL = "https://api.zotero.org";

/**
 * Fetches user library items from the official Zotero Web API v3.
 */
export async function fetchUserLibrary(
  apiKey: string,
  userId: string,
  options?: { limit?: number; since?: number },
): Promise<ZoteroItem[]> {
  const limit = options?.limit ?? 50;
  const url = new URL(
    `/users/${encodeURIComponent(userId)}/items`,
    ZOTERO_BASE_URL,
  );
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(limit));
  if (options?.since) {
    url.searchParams.set("since", String(options.since));
  }

  const response = await fetch(url.toString(), {
    headers: {
      "Zotero-API-Version": "3",
      "Zotero-API-Key": apiKey,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Zotero API error: HTTP ${response.status} ${response.statusText}`,
    );
  }

  const items = (await response.json()) as ZoteroItem[];
  return items;
}

/**
 * Normalizes Zotero API items into Ithaca's standard ImportedPaper format.
 */
export function normalizeZoteroItems(
  items: Array<ZoteroItem | ZoteroItemData | Record<string, unknown>>,
): ImportedPaper[] {
  const jsonString = JSON.stringify(items);
  const result = importPapers("zotero", jsonString, { source: "zotero-api" });
  return result.papers;
}

/**
 * Inspects a list of paper identifiers (DOIs, OpenAlex IDs) against Ithaca's citation cache
 * and identifies active scientific contradictions / disputes.
 */
export async function findConflictingStudies(
  identifiers: string[],
): Promise<ConflictingStudyAlert[]> {
  const validIds = identifiers.filter(Boolean);
  if (validIds.length === 0) return [];

  // Query citation cache for contradiction edges involving these papers
  const contradictions = await prisma.citationCache.findMany({
    where: {
      edgeType: "contradicts",
      OR: [{ citedId: { in: validIds } }, { citingId: { in: validIds } }],
    },
    select: {
      citingId: true,
      citedId: true,
      snippet: true,
      confidence: true,
    },
  });

  const alertsMap = new Map<string, ConflictingStudyAlert>();

  for (const c of contradictions) {
    const matchedId = validIds.find(
      (id) => id === c.citedId || id === c.citingId,
    );
    if (!matchedId) continue;

    const existing = alertsMap.get(matchedId) || {
      paperIdentifier: matchedId,
      doi: matchedId.startsWith("10.") ? matchedId : undefined,
      contradictingCount: 0,
      disputes: [],
    };

    existing.contradictingCount += 1;
    existing.disputes.push({
      citingId: c.citingId,
      snippet: c.snippet,
      confidence: c.confidence,
    });

    alertsMap.set(matchedId, existing);
  }

  return Array.from(alertsMap.values());
}

/**
 * Synchronizes user library items with Ithaca and detects active scientific disputes.
 */
export async function syncZoteroLibraryWithIthaca(
  items: Array<ZoteroItem | ZoteroItemData | Record<string, unknown>>,
  _organizationId?: string,
  _userId?: string,
): Promise<SyncZoteroResult> {
  const importedPapers = normalizeZoteroItems(items);
  const identifiers = importedPapers
    .flatMap((p) => [p.identifiers?.doi, p.identifiers?.openAlex])
    .filter((id): id is string => Boolean(id));
  const conflictingStudies = await findConflictingStudies(identifiers);
  const activeDisputeCount = conflictingStudies.reduce(
    (acc, curr) => acc + curr.contradictingCount,
    0,
  );

  return {
    syncedItemCount: items.length,
    importedPapers,
    conflictingStudies,
    activeDisputeCount,
  };
}
