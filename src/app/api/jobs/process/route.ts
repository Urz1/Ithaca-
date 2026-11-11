import { NextRequest } from "next/server";
import { z } from "zod";
import {
  apiError,
  apiSuccess,
  createApiContext,
} from "@/lib/api/api-contracts";
import { requireApiAuth } from "@/lib/api/api-auth";
import { logEvent } from "@/lib/platform/telemetry";
import { getOrganizationContext } from "@/lib/organization-context";
import { processCollectionDigestJob } from "@/modules/jobs/handlers/collection-digest";
import { processGraphExportJob } from "@/modules/jobs/handlers/graph-export";
import { processMetadataReconciliationJob } from "@/modules/jobs/handlers/metadata-reconciliation";
import { processNadreHarvestJob } from "@/modules/jobs/handlers/nadre-harvest";
import { markBackgroundJobFailed } from "@/modules/jobs/job-service";
import { JOB_TYPES } from "@/modules/jobs/job-policy";
import { verifyJobSignature } from "@/modules/jobs/queue";

const baseJobSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  requestedByUserId: z.string().min(1),
  requestedAt: z.string().datetime(),
});

const exportJobSchema = baseJobSchema.extend({
  type: z.literal(JOB_TYPES.graphExport),
  payload: z.object({
    jobId: z.string().min(1),
    artifactId: z.string().min(1),
    filename: z.string().min(1).max(255),
    content: z.string(),
    contentType: z.string().min(1).max(100),
    encoding: z.enum(["utf8", "base64"]).optional(),
  }),
});

const metadataJobSchema = baseJobSchema.extend({
  type: z.literal(JOB_TYPES.metadataReconciliation),
  payload: z.object({
    jobId: z.string().min(1),
    paperRecordIds: z.array(z.string().min(1)).min(1).max(500),
  }),
});

const digestJobSchema = baseJobSchema.extend({
  type: z.literal(JOB_TYPES.savedSearchAlert),
  payload: z.object({
    jobId: z.string().min(1),
    collectionIds: z.array(z.string().min(1)).max(100).optional(),
  }),
});

const nadreHarvestJobSchema = baseJobSchema.extend({
  type: z.literal(JOB_TYPES.nadreHarvest),
  payload: z.object({
    jobId: z.string().min(1),
    repositorySlug: z.string().min(1),
    from: z.string().optional(),
    until: z.string().optional(),
    set: z.string().optional(),
    resumptionToken: z.string().optional(),
    maxRecords: z.number().optional(),
  }),
});

const jobSchema = z.discriminatedUnion("type", [
  exportJobSchema,
  metadataJobSchema,
  digestJobSchema,
  nadreHarvestJobSchema,
]);

export async function POST(request: NextRequest) {
  const context = createApiContext(request);
  const signature = request.headers.get("upstash-signature");
  const body = await request.text();

  if (!signature || !(await verifyJobSignature(signature, body, request.url))) {
    return apiError(
      "AUTHENTICATION_REQUIRED",
      "Invalid job signature",
      context,
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return apiError("INVALID_REQUEST", "Job payload must be JSON", context);
  }

  const parsed = jobSchema.safeParse(payload);
  if (!parsed.success) {
    return apiError("INVALID_REQUEST", "Invalid job payload", context, {
      details: parsed.error.flatten(),
    });
  }

  const job = parsed.data;

  try {
    if (job.type === JOB_TYPES.graphExport) {
      const result = await processGraphExportJob({
        jobId: job.payload.jobId,
        organizationId: job.organizationId,
        requestedByUserId: job.requestedByUserId,
        artifactId: job.payload.artifactId,
        filename: job.payload.filename,
        content: job.payload.content,
        contentType: job.payload.contentType,
        encoding: job.payload.encoding,
      });

      logEvent("info", "job.completed", {
        requestId: context.requestId,
        jobId: job.id,
        userId: job.requestedByUserId,
        organizationId: job.organizationId,
        attributes: { type: job.type, artifactId: job.payload.artifactId },
      });

      return apiSuccess({ processed: true, ...result }, context);
    }

    if (job.type === JOB_TYPES.metadataReconciliation) {
      const result = await processMetadataReconciliationJob({
        jobId: job.payload.jobId,
        organizationId: job.organizationId,
        paperRecordIds: job.payload.paperRecordIds,
      });

      logEvent("info", "job.completed", {
        requestId: context.requestId,
        jobId: job.id,
        userId: job.requestedByUserId,
        organizationId: job.organizationId,
        attributes: { type: job.type, updated: result.updated },
      });

      return apiSuccess({ processed: true, ...result }, context);
    }

    if (job.type === JOB_TYPES.nadreHarvest) {
      const result = await processNadreHarvestJob({
        jobId: job.payload.jobId,
        organizationId: job.organizationId,
        requestedByUserId: job.requestedByUserId,
        repositorySlug: job.payload.repositorySlug,
        from: job.payload.from,
        until: job.payload.until,
        set: job.payload.set,
        resumptionToken: job.payload.resumptionToken,
        maxRecords: job.payload.maxRecords,
      });

      logEvent("info", "job.completed", {
        requestId: context.requestId,
        jobId: job.id,
        userId: job.requestedByUserId,
        organizationId: job.organizationId,
        attributes: {
          type: job.type,
          repositorySlug: result.repositorySlug,
          totalHarvested: result.totalHarvested,
        },
      });

      return apiSuccess({ processed: true, ...result }, context);
    }

    const result = await processCollectionDigestJob({
      jobId: job.payload.jobId,
      organizationId: job.organizationId,
      collectionIds: job.payload.collectionIds,
    });

    logEvent("info", "job.completed", {
      requestId: context.requestId,
      jobId: job.id,
      userId: job.requestedByUserId,
      organizationId: job.organizationId,
      attributes: { type: job.type, emailsSent: result.emailsSent },
    });

    return apiSuccess({ processed: true, ...result }, context);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Background job failed";
    await markBackgroundJobFailed(job.payload.jobId, message);
    logEvent("error", "job.failed", {
      requestId: context.requestId,
      jobId: job.id,
      userId: job.requestedByUserId,
      organizationId: job.organizationId,
      attributes: { type: job.type, message },
    });
    return apiError("INTERNAL_ERROR", message, context);
  }
}
