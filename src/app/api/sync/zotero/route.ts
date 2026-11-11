import { NextRequest } from "next/server";
import { z } from "zod";
import {
  apiError,
  apiSuccess,
  createApiContext,
} from "@/lib/api/api-contracts";
import {
  checkApiRateLimit,
  isRejection,
  requireApiAuth,
} from "@/lib/api/api-auth";
import { getOrganizationContext } from "@/lib/organization-context";
import { prisma } from "@/lib/prisma";
import {
  fetchUserLibrary,
  findConflictingStudies,
  normalizeZoteroItems,
  type ZoteroItem,
} from "@/lib/api/zotero-client";

const syncSchema = z.object({
  apiKey: z.string().min(1),
  userId: z.string().min(1),
  collectionTitle: z.string().optional().default("Zotero Library"),
  limit: z.number().int().min(1).max(100).optional().default(50),
  items: z.array(z.record(z.any())).optional(),
});

export async function POST(request: NextRequest) {
  const context = createApiContext(request);
  const authResult = await requireApiAuth(request, context);
  if (isRejection(authResult)) return authResult;

  const org = await getOrganizationContext();
  const organizationId =
    org?.organizationId ||
    (
      await prisma.membership.findFirst({
        where: { userId: authResult.user.id },
        select: { organizationId: true },
      })
    )?.organizationId;

  if (!organizationId) {
    return apiError(
      "AUTHENTICATION_REQUIRED",
      "Organization context required",
      context,
    );
  }

  const rateLimited = await checkApiRateLimit(
    authResult.user.id,
    "zotero-sync",
    30,
    context,
  );
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "INVALID_REQUEST",
        "Invalid Zotero sync configuration",
        context,
        {
          details: parsed.error.flatten(),
        },
      );
    }

    const {
      apiKey,
      userId,
      collectionTitle,
      limit,
      items: directItems,
    } = parsed.data;

    // 1. Retrieve raw items from direct payload or live Zotero API
    let rawItems: Array<ZoteroItem | Record<string, unknown>> = [];
    if (directItems && directItems.length > 0) {
      rawItems = directItems;
    } else {
      rawItems = await fetchUserLibrary(apiKey, userId, { limit });
    }

    // 2. Normalize items to Ithaca standard schema
    const normalizedPapers = normalizeZoteroItems(rawItems);

    // 3. Upsert into a dedicated Collection for the user & organization
    let collection = await prisma.collection.findFirst({
      where: {
        organizationId,
        userId: authResult.user.id,
        title: collectionTitle,
      },
    });

    if (!collection) {
      collection = await prisma.collection.create({
        data: {
          organizationId,
          userId: authResult.user.id,
          title: collectionTitle,
          watchEnabled: true,
          paperIds: [],
        },
      });
    }

    // 4. Persist papers as PaperRecords
    const paperIdsToTrack: string[] = [...collection.paperIds];
    const targetIdentifiersForConflictScan: string[] = [];

    for (const paper of normalizedPapers) {
      const doi = paper.identifiers.doi;
      const dedupeKey = doi
        ? `doi:${doi.toLowerCase()}`
        : `title:${(paper.title || "").toLowerCase().slice(0, 100)}`;
      if (!dedupeKey) continue;

      if (doi) targetIdentifiersForConflictScan.push(doi);

      const paperRecord = await prisma.paperRecord.upsert({
        where: {
          organizationId_dedupeKey: {
            organizationId,
            dedupeKey,
          },
        },
        update: {
          title: paper.title,
          authors: paper.authors,
          year: paper.year,
          venue: paper.venue,
          abstract: paper.abstract,
          doi,
          sourceUpdatedAt: paper.freshness.sourceUpdatedAt
            ? new Date(paper.freshness.sourceUpdatedAt)
            : undefined,
        },
        create: {
          organizationId,
          userId: authResult.user.id,
          dedupeKey,
          title: paper.title,
          authors: paper.authors,
          year: paper.year,
          venue: paper.venue,
          abstract: paper.abstract,
          doi,
          provenance: paper.provenance as any,
          sourceUpdatedAt: paper.freshness.sourceUpdatedAt
            ? new Date(paper.freshness.sourceUpdatedAt)
            : undefined,
        },
      });

      if (!paperIdsToTrack.includes(paperRecord.id)) {
        paperIdsToTrack.push(paperRecord.id);
      }
      targetIdentifiersForConflictScan.push(paperRecord.id);
    }

    // Update collection paper list
    await prisma.collection.update({
      where: { id: collection.id },
      data: { paperIds: paperIdsToTrack },
    });

    // 5. Scan for conflicting / disputing citations
    const conflictingStudies = await findConflictingStudies(
      targetIdentifiersForConflictScan,
    );

    // 6. Record Zotero sync history
    await prisma.zoteroSyncRecord.create({
      data: {
        organizationId,
        userId: authResult.user.id,
        libraryId: userId,
        collectionId: collection.id,
        syncedItemCount: normalizedPapers.length,
        activeDisputeCount: conflictingStudies.length,
      },
    });

    return apiSuccess(
      {
        synced: true,
        syncedItemCount: normalizedPapers.length,
        collectionId: collection.id,
        activeDisputeCount: conflictingStudies.length,
        conflictingStudies,
      },
      context,
    );
  } catch (error) {
    console.error("[sync/zotero:POST]", error);
    return apiError("INTERNAL_ERROR", "Failed to sync Zotero library", context);
  }
}

export async function GET(request: NextRequest) {
  const context = createApiContext(request);
  const authResult = await requireApiAuth(request, context);
  if (isRejection(authResult)) return authResult;

  const org = await getOrganizationContext();
  const organizationId =
    org?.organizationId ||
    (
      await prisma.membership.findFirst({
        where: { userId: authResult.user.id },
        select: { organizationId: true },
      })
    )?.organizationId;

  if (!organizationId) {
    return apiError(
      "AUTHENTICATION_REQUIRED",
      "Organization context required",
      context,
    );
  }

  try {
    const latestSync = await prisma.zoteroSyncRecord.findFirst({
      where: {
        organizationId,
        userId: authResult.user.id,
      },
      orderBy: { lastSyncAt: "desc" },
    });

    if (!latestSync || !latestSync.collectionId) {
      return apiSuccess(
        {
          hasSynced: false,
          syncedItemCount: 0,
          activeDisputeCount: 0,
          conflictingStudies: [],
        },
        context,
      );
    }

    const collection = await prisma.collection.findUnique({
      where: { id: latestSync.collectionId },
    });

    const paperIds = collection?.paperIds || [];
    const paperRecords = await prisma.paperRecord.findMany({
      where: {
        OR: [
          { id: { in: paperIds } },
          { openAlexId: { in: paperIds } },
          { doi: { in: paperIds } },
        ],
      },
      select: { id: true, doi: true, openAlexId: true },
    });

    const identifiers: string[] = [...paperIds];
    paperRecords.forEach((p) => {
      if (p.id) identifiers.push(p.id);
      if (p.doi) identifiers.push(p.doi);
      if (p.openAlexId) identifiers.push(p.openAlexId);
    });

    const conflictingStudies = await findConflictingStudies(identifiers);

    return apiSuccess(
      {
        hasSynced: true,
        lastSyncAt: latestSync.lastSyncAt,
        syncedItemCount: latestSync.syncedItemCount,
        activeDisputeCount: conflictingStudies.length,
        conflictingStudies,
      },
      context,
    );
  } catch (error) {
    console.error("[sync/zotero:GET]", error);
    return apiError(
      "INTERNAL_ERROR",
      "Failed to retrieve Zotero conflict monitoring status",
      context,
    );
  }
}
