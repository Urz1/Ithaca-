import { NextRequest } from "next/server";
import { z } from "zod";
import {
  apiError,
  apiSuccess,
  createApiContext,
} from "@/lib/api/api-contracts";
import {
  requireApiAuth,
  checkApiRateLimit,
  isRejection,
} from "@/lib/api/api-auth";
import { getOptionalOrganizationContextFromRequest } from "@/lib/api/request-organization";
import { recordAuditEvent } from "@/lib/organization-context";
import { SOVEREIGN_REPOSITORIES } from "@/lib/api/oai-pmh-client";
import { enqueueNadreHarvest } from "@/modules/jobs/nadre-harvest-job";
import { processNadreHarvestJob } from "@/modules/jobs/handlers/nadre-harvest";
import { createHash } from "node:crypto";
import { createBackgroundJob } from "@/modules/jobs/job-service";
import { JOB_TYPES, createIdempotencyKey } from "@/modules/jobs/job-policy";

const harvestRequestSchema = z.object({
  repositorySlug: z
    .string()
    .refine((slug) => Object.keys(SOVEREIGN_REPOSITORIES).includes(slug), {
      message: "Unsupported sovereign repository slug",
    })
    .default("aau"),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD")
    .optional(),
  until: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Format must be YYYY-MM-DD")
    .optional(),
  set: z.string().optional(),
  maxRecords: z.number().int().min(1).max(200).default(50),
  sync: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const context = createApiContext(request);
  const orgContext = await getOptionalOrganizationContextFromRequest(request);

  // Authentication check
  const authResult = await requireApiAuth(request, context);
  if (isRejection(authResult)) {
    return authResult;
  }

  // Rate limit
  const rateLimitResult = await checkApiRateLimit(
    authResult.user.id,
    "harvest-nadre",
    20,
    context,
    orgContext?.organizationId,
  );
  if (rateLimitResult) {
    return rateLimitResult;
  }

  // Validate body
  let bodyJson: unknown = {};
  try {
    const raw = await request.text();
    if (raw.trim()) {
      bodyJson = JSON.parse(raw);
    }
  } catch {
    return apiError("INVALID_REQUEST", "Invalid JSON payload", context);
  }

  const parseResult = harvestRequestSchema.safeParse(bodyJson);
  if (!parseResult.success) {
    return apiError(
      "INVALID_REQUEST",
      parseResult.error.errors[0]?.message || "Invalid harvest payload",
      context,
    );
  }

  const { repositorySlug, from, until, set, maxRecords, sync } =
    parseResult.data;
  const organizationId = orgContext?.organizationId || authResult.user.id;

  // Audit event
  if (orgContext) {
    await recordAuditEvent(orgContext, {
      action: "sovereign.harvest_triggered",
      entityType: "sovereign_repository",
      entityId: repositorySlug,
      metadata: { from, until, maxRecords, sync },
    });
  }

  if (sync) {
    // Synchronous execution (useful for manual triggering & testing)
    const fingerprint = createHash("sha256")
      .update(
        [
          repositorySlug,
          from || "",
          until || "",
          set || "",
          Date.now().toString(),
        ].join(":"),
      )
      .digest("hex");

    const idempotencyKey = createIdempotencyKey(
      organizationId,
      JOB_TYPES.nadreHarvest,
      fingerprint,
    );

    const job = await createBackgroundJob({
      organizationId,
      userId: authResult.user.id,
      type: JOB_TYPES.nadreHarvest,
      idempotencyKey,
      payload: { repositorySlug, from, until, set, maxRecords },
    });

    const result = await processNadreHarvestJob({
      jobId: job.id,
      organizationId,
      requestedByUserId: authResult.user.id,
      repositorySlug,
      from,
      until,
      set,
      maxRecords,
    });

    return apiSuccess(
      {
        sync: true,
        jobId: job.id,
        status: "COMPLETED",
        ...result,
      },
      context,
    );
  }

  // Asynchronous background job via queue
  const enqueued = await enqueueNadreHarvest({
    organizationId,
    requestedByUserId: authResult.user.id,
    repositorySlug,
    from,
    until,
    set,
    maxRecords,
  });

  return apiSuccess(
    {
      sync: false,
      jobId: enqueued?.jobId,
      status: enqueued?.status || "QUEUED",
      repositorySlug,
    },
    context,
  );
}

export async function GET(request: NextRequest) {
  const context = createApiContext(request);

  // Returns list of supported sovereign repositories & their status
  const repos = Object.values(SOVEREIGN_REPOSITORIES).map((r) => ({
    slug: r.slug,
    name: r.name,
    country: r.country,
    description: r.description,
    institutionalDomain: r.institutionalDomain,
  }));

  return apiSuccess(
    {
      supportedRepositories: repos,
      total: repos.length,
    },
    context,
  );
}
