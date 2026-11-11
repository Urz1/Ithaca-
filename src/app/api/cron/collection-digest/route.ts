import { NextRequest } from "next/server";
import {
  apiError,
  apiSuccess,
  createApiContext,
} from "@/lib/api/api-contracts";
import { prisma } from "@/lib/prisma";
import { enqueueCollectionDigest } from "@/modules/jobs/collection-digest-job";
import { processCollectionDigestJob } from "@/modules/jobs/handlers/collection-digest";
import { JOB_TYPES } from "@/modules/jobs/job-policy";
import { isDurableJobsEnabled } from "@/modules/jobs/job-runtime";

/**
 * Weekly digest trigger. Protect with CRON_SECRET.
 * When durable jobs are enabled, enqueues per-organization jobs.
 * Otherwise processes inline for the requested organization.
 */
export async function POST(request: NextRequest) {
  const context = createApiContext(request);
  const secret = process.env.CRON_SECRET;
  const provided =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.headers.get("x-cron-secret");

  if (!secret || provided !== secret) {
    return apiError("AUTHENTICATION_REQUIRED", "Invalid cron secret", context);
  }

  const organizationId = request.nextUrl.searchParams.get("organizationId");
  const collections = await prisma.collection.findMany({
    where: {
      watchEnabled: true,
      ...(organizationId ? { organizationId } : {}),
    },
    select: {
      organizationId: true,
      userId: true,
    },
  });

  const byOrg = new Map<string, string>();
  for (const collection of collections) {
    if (!byOrg.has(collection.organizationId)) {
      byOrg.set(collection.organizationId, collection.userId);
    }
  }

  const results: Array<{ organizationId: string; jobId?: string }> = [];

  for (const [orgId, userId] of byOrg) {
    if (isDurableJobsEnabled()) {
      const enqueued = await enqueueCollectionDigest({
        organizationId: orgId,
        requestedByUserId: userId,
      });
      results.push({ organizationId: orgId, jobId: enqueued?.jobId });
    } else {
      const { createBackgroundJob } =
        await import("@/modules/jobs/job-service");
      const job = await createBackgroundJob({
        organizationId: orgId,
        userId,
        type: JOB_TYPES.savedSearchAlert,
        idempotencyKey: `inline-digest-${orgId}-${new Date().toISOString().slice(0, 10)}`,
        payload: {},
      });
      await processCollectionDigestJob({
        jobId: job.id,
        organizationId: orgId,
      });
      results.push({ organizationId: orgId, jobId: job.id });
    }
  }

  return apiSuccess(
    {
      organizations: results.length,
      results,
    },
    context,
  );
}
