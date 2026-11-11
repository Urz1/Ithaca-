import { extractOpenAlexId } from "@/lib/api/openalex-types";
import { prisma } from "@/lib/prisma";
import { scopeToOrganization } from "@/lib/tenancy-policy";
import {
  markBackgroundJobCompleted,
  markBackgroundJobFailed,
  markBackgroundJobProcessing,
} from "../job-service";

const OPENALEX_BASE = "https://api.openalex.org";

async function fetchOpenAlexWorkByDoi(doi: string) {
  const response = await fetch(
    `${OPENALEX_BASE}/works/https://doi.org/${encodeURIComponent(doi)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": process.env.OPENALEX_EMAIL
          ? `Ithaca/1.0 (mailto:${process.env.OPENALEX_EMAIL})`
          : "Ithaca/1.0",
      },
      next: { revalidate: 3600 },
    },
  );

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`OpenAlex lookup failed (${response.status})`);
  }

  return response.json() as Promise<{
    id?: string;
    title?: string;
    display_name?: string;
    publication_year?: number;
    authorships?: Array<{ author?: { display_name?: string } }>;
    primary_location?: { source?: { display_name?: string } };
    abstract_inverted_index?: Record<string, number[]>;
  }>;
}

function reconstructAbstract(
  invertedIndex?: Record<string, number[]>,
): string | undefined {
  if (!invertedIndex) return undefined;
  const positions: Array<[number, string]> = [];
  for (const [word, indexes] of Object.entries(invertedIndex)) {
    for (const index of indexes) {
      positions.push([index, word]);
    }
  }
  positions.sort((a, b) => a[0] - b[0]);
  const text = positions
    .map(([, word]) => word)
    .join(" ")
    .trim();
  return text || undefined;
}

export async function processMetadataReconciliationJob(input: {
  jobId: string;
  organizationId: string;
  paperRecordIds: string[];
}) {
  await markBackgroundJobProcessing(input.jobId);

  const records = await prisma.paperRecord.findMany({
    where: scopeToOrganization(input.organizationId, {
      id: { in: input.paperRecordIds },
      openAlexId: null,
      doi: { not: null },
    }),
  });

  let updated = 0;
  let skipped = 0;
  const failures: string[] = [];

  for (const record of records) {
    if (!record.doi) {
      skipped += 1;
      continue;
    }

    try {
      const work = await fetchOpenAlexWorkByDoi(record.doi);
      if (!work?.id) {
        skipped += 1;
        continue;
      }

      const openAlexId = extractOpenAlexId(work.id);
      const authors =
        work.authorships
          ?.map((authorship) => authorship.author?.display_name)
          .filter(Boolean) ?? record.authors;

      await prisma.paperRecord.update({
        where: { id: record.id },
        data: {
          openAlexId,
          title: record.title ?? work.title ?? work.display_name,
          year: record.year ?? work.publication_year,
          venue:
            record.venue ??
            work.primary_location?.source?.display_name ??
            undefined,
          abstract:
            record.abstract ??
            reconstructAbstract(work.abstract_inverted_index),
        },
      });
      updated += 1;
    } catch (error) {
      failures.push(
        `${record.id}: ${error instanceof Error ? error.message : "lookup failed"}`,
      );
    }
  }

  if (failures.length > 0 && updated === 0) {
    await markBackgroundJobFailed(input.jobId, failures.slice(0, 3).join("; "));
    return { updated, skipped, failures };
  }

  await markBackgroundJobCompleted(input.jobId, {
    updated,
    skipped,
    failures: failures.length,
  });

  return { updated, skipped, failures };
}
