import { createHash } from "node:crypto";
import { createIdempotencyKey, JOB_TYPES } from "./job-policy";
import {
  createBackgroundJob,
  findBackgroundJobByIdempotencyKey,
} from "./job-service";
import { enqueueJob } from "./queue";

export interface NadreHarvestJobInput {
  organizationId: string;
  requestedByUserId: string;
  repositorySlug: string;
  from?: string;
  until?: string;
  set?: string;
  resumptionToken?: string;
  maxRecords?: number;
}

export async function enqueueNadreHarvest(input: NadreHarvestJobInput) {
  const fingerprint = createHash("sha256")
    .update(
      [
        input.repositorySlug,
        input.from || "",
        input.until || "",
        input.set || "",
        input.resumptionToken || "",
      ].join(":"),
    )
    .digest("hex");

  const idempotencyKey = createIdempotencyKey(
    input.organizationId,
    JOB_TYPES.nadreHarvest,
    fingerprint,
  );

  const existing = await findBackgroundJobByIdempotencyKey(idempotencyKey);
  if (existing && existing.status !== "FAILED") {
    return { jobId: existing.id, status: existing.status };
  }

  const job = await createBackgroundJob({
    organizationId: input.organizationId,
    userId: input.requestedByUserId,
    type: JOB_TYPES.nadreHarvest,
    idempotencyKey,
    payload: {
      repositorySlug: input.repositorySlug,
      from: input.from,
      until: input.until,
      set: input.set,
      resumptionToken: input.resumptionToken,
      maxRecords: input.maxRecords,
    },
  });

  await enqueueJob({
    id: job.id,
    type: JOB_TYPES.nadreHarvest,
    organizationId: input.organizationId,
    requestedByUserId: input.requestedByUserId,
    requestedAt: new Date().toISOString(),
    payload: {
      jobId: job.id,
      repositorySlug: input.repositorySlug,
      from: input.from,
      until: input.until,
      set: input.set,
      resumptionToken: input.resumptionToken,
      maxRecords: input.maxRecords,
    },
  });

  return { jobId: job.id, status: job.status };
}
