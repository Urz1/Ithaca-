import { prisma } from "@/lib/prisma";
import { oaiPmhClient } from "@/lib/api/oai-pmh-client";
import {
  markBackgroundJobCompleted,
  markBackgroundJobFailed,
  markBackgroundJobProcessing,
} from "../job-service";

export interface NadreHarvestJobPayload {
  jobId: string;
  organizationId: string;
  requestedByUserId: string;
  repositorySlug: string;
  from?: string;
  until?: string;
  set?: string;
  resumptionToken?: string;
  maxRecords?: number;
}

export async function processNadreHarvestJob(input: NadreHarvestJobPayload) {
  await markBackgroundJobProcessing(input.jobId);

  try {
    const harvestResult = await oaiPmhClient.harvestRecords({
      repositorySlug: input.repositorySlug,
      from: input.from,
      until: input.until,
      set: input.set,
      resumptionToken: input.resumptionToken,
    });

    let recordsToProcess = harvestResult.records;
    if (input.maxRecords && input.maxRecords > 0) {
      recordsToProcess = recordsToProcess.slice(0, input.maxRecords);
    }

    let createdCount = 0;
    let updatedCount = 0;

    for (const record of recordsToProcess) {
      const existing = await prisma.paperRecord.findUnique({
        where: {
          organizationId_dedupeKey: {
            organizationId: input.organizationId,
            dedupeKey: record.dedupeKey,
          },
        },
      });

      if (existing) {
        await prisma.paperRecord.update({
          where: { id: existing.id },
          data: {
            title: record.title || existing.title,
            authors:
              record.authors.length > 0 ? record.authors : existing.authors,
            year: record.year || existing.year,
            abstract: record.abstract || existing.abstract,
            repositoryHandle: record.handleUri || existing.repositoryHandle,
            advisorNames:
              record.advisors.length > 0
                ? record.advisors
                : existing.advisorNames,
            doi: record.doi || existing.doi,
            pdfUrl: record.pdfUrl || existing.pdfUrl,
            sourceUpdatedAt: new Date(),
          },
        });
        updatedCount++;
      } else {
        await prisma.paperRecord.create({
          data: {
            organizationId: input.organizationId,
            userId: input.requestedByUserId,
            dedupeKey: record.dedupeKey,
            title: record.title,
            authors: record.authors,
            year: record.year,
            venue: record.institutionName,
            abstract: record.abstract,
            pdfUrl: record.pdfUrl,
            doi: record.doi,
            isSovereignIndex: true,
            institutionSlug: record.institutionSlug,
            repositoryHandle: record.handleUri,
            advisorNames: record.advisors,
            provenance: {
              source: "OAI-PMH",
              repositorySlug: record.institutionSlug,
              institutionName: record.institutionName,
              identifier: record.identifier,
              datestamp: record.datestamp,
              harvestedAt: new Date().toISOString(),
            },
          },
        });
        createdCount++;
      }
    }

    const summary = {
      repositorySlug: input.repositorySlug,
      repositoryName: harvestResult.repositoryName,
      totalHarvested: recordsToProcess.length,
      createdCount,
      updatedCount,
      hasMore: harvestResult.hasMore,
      resumptionToken: harvestResult.resumptionToken,
      completeListSize: harvestResult.completeListSize,
    };

    await markBackgroundJobCompleted(input.jobId, summary);
    return summary;
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error
        ? err.message
        : "Failed to execute NADRE harvest job";
    await markBackgroundJobFailed(input.jobId, errorMsg);
    throw err;
  }
}
