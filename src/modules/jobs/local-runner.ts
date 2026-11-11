/**
 * Local Autonomous Job Runner
 *
 * Executes background jobs in-process for local, sovereign, and on-premise
 * environments where external cloud message queues (Upstash QStash) are
 * unavailable or restricted under Article 41 of Proclamation 1396.
 */

import { JOB_TYPES } from "./job-policy";
import { processCollectionDigestJob } from "./handlers/collection-digest";
import { processGraphExportJob } from "./handlers/graph-export";
import { processMetadataReconciliationJob } from "./handlers/metadata-reconciliation";
import { processNadreHarvestJob } from "./handlers/nadre-harvest";
import { markBackgroundJobFailed } from "./job-service";
import type { JobEnvelope } from "./queue";

export async function processJobLocally<
  TPayload extends Record<string, unknown>,
>(job: JobEnvelope<TPayload>): Promise<void> {
  try {
    const payload = job.payload as any;

    if (job.type === JOB_TYPES.graphExport) {
      await processGraphExportJob({
        jobId: payload.jobId,
        organizationId: job.organizationId,
        requestedByUserId: job.requestedByUserId,
        artifactId: payload.artifactId,
        filename: payload.filename,
        content: payload.content,
        contentType: payload.contentType,
        encoding: payload.encoding,
      });
      return;
    }

    if (job.type === JOB_TYPES.metadataReconciliation) {
      await processMetadataReconciliationJob({
        jobId: payload.jobId,
        organizationId: job.organizationId,
        paperRecordIds: payload.paperRecordIds,
      });
      return;
    }

    if (job.type === JOB_TYPES.nadreHarvest) {
      await processNadreHarvestJob({
        jobId: payload.jobId,
        organizationId: job.organizationId,
        requestedByUserId: job.requestedByUserId,
        repositorySlug: payload.repositorySlug,
        from: payload.from,
        until: payload.until,
        set: payload.set,
        resumptionToken: payload.resumptionToken,
        maxRecords: payload.maxRecords,
      });
      return;
    }

    if (job.type === JOB_TYPES.savedSearchAlert) {
      await processCollectionDigestJob({
        jobId: payload.jobId,
        organizationId: job.organizationId,
        collectionIds: payload.collectionIds,
      });
      return;
    }

    console.warn("[local-runner] Unknown job type encountered:", job.type);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Local background job failed";
    console.error("[local-runner] Job execution failed:", job.id, errorMessage);
    const jobId = (job.payload as any)?.jobId || job.id;
    await markBackgroundJobFailed(jobId, errorMessage);
  }
}
