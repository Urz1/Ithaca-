import type { Prisma, PrismaClient } from "@prisma/client";
import { buildPaperDedupeKey } from "./paper-keys";
import type { ImportedPaper } from "./types";

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface PersistImportedPapersInput {
  organizationId: string;
  userId: string;
  papers: ImportedPaper[];
}

export interface PersistImportedPapersResult {
  records: Array<{
    id: string;
    dedupeKey: string;
    openAlexId: string | null;
    doi: string | null;
    title: string | null;
  }>;
  createdCount: number;
  updatedCount: number;
}

function toDate(value?: string): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function mergeProvenance(
  existing: Prisma.JsonValue | null,
  incoming: ImportedPaper["provenance"],
): Prisma.InputJsonValue {
  const current = Array.isArray(existing) ? existing : [];
  return [...current, ...incoming] as Prisma.InputJsonValue;
}

export async function persistImportedPapers(
  db: DbClient,
  input: PersistImportedPapersInput,
): Promise<PersistImportedPapersResult> {
  const records: PersistImportedPapersResult["records"] = [];
  let createdCount = 0;
  let updatedCount = 0;

  for (const paper of input.papers) {
    const dedupeKey = buildPaperDedupeKey(paper);
    const existing = await db.paperRecord.findUnique({
      where: {
        organizationId_dedupeKey: {
          organizationId: input.organizationId,
          dedupeKey,
        },
      },
    });

    if (existing) {
      const updated = await db.paperRecord.update({
        where: { id: existing.id },
        data: {
          doi: paper.identifiers.doi ?? existing.doi,
          openAlexId: paper.identifiers.openAlex ?? existing.openAlexId,
          title: paper.title ?? existing.title,
          authors: paper.authors.length > 0 ? paper.authors : existing.authors,
          year: paper.year ?? existing.year,
          venue: paper.venue ?? existing.venue,
          abstract: paper.abstract ?? existing.abstract,
          provenance: mergeProvenance(existing.provenance, paper.provenance),
          importedAt: new Date(paper.freshness.importedAt),
          sourceUpdatedAt:
            toDate(paper.freshness.sourceUpdatedAt) ?? existing.sourceUpdatedAt,
        },
      });
      updatedCount += 1;
      records.push({
        id: updated.id,
        dedupeKey: updated.dedupeKey,
        openAlexId: updated.openAlexId,
        doi: updated.doi,
        title: updated.title,
      });
      continue;
    }

    const created = await db.paperRecord.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        dedupeKey,
        doi: paper.identifiers.doi,
        openAlexId: paper.identifiers.openAlex,
        title: paper.title,
        authors: paper.authors,
        year: paper.year,
        venue: paper.venue,
        abstract: paper.abstract,
        provenance: paper.provenance as unknown as Prisma.InputJsonValue,
        importedAt: new Date(paper.freshness.importedAt),
        sourceUpdatedAt: toDate(paper.freshness.sourceUpdatedAt),
      },
    });
    createdCount += 1;
    records.push({
      id: created.id,
      dedupeKey: created.dedupeKey,
      openAlexId: created.openAlexId,
      doi: created.doi,
      title: created.title,
    });
  }

  return { records, createdCount, updatedCount };
}

export async function linkPaperRecordsToCollection(
  db: DbClient,
  input: {
    organizationId: string;
    collectionId: string;
    paperRecordIds: string[];
  },
): Promise<{ linkedCount: number; paperIds: string[] }> {
  const collection = await db.collection.findFirst({
    where: {
      id: input.collectionId,
      organizationId: input.organizationId,
    },
    select: { paperIds: true },
  });
  if (!collection) {
    throw new Error("Collection not found");
  }

  const nextPaperIds = [...collection.paperIds];
  let linkedCount = 0;

  for (const paperRecordId of input.paperRecordIds) {
    if (nextPaperIds.includes(paperRecordId)) continue;
    nextPaperIds.push(paperRecordId);
    linkedCount += 1;
  }

  if (linkedCount > 0) {
    await db.collection.update({
      where: { id: input.collectionId },
      data: { paperIds: nextPaperIds },
    });
  }

  return { linkedCount, paperIds: nextPaperIds };
}
