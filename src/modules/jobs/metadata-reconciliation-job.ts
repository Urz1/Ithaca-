import { createHash } from "node:crypto";
import { createIdempotencyKey, JOB_TYPES } from "./job-policy";
import {
  createBackgroundJob,
  findBackgroundJobByIdempotencyKey,
} from "./job-service";
import { enqueueJob } from "./queue";

export interface MetadataReconciliationJobInput {
  organizationId: string;
  requestedByUserId: string;
  paperRecordIds: string[];
}

export async function enqueueMetadataReconciliation(
  input: MetadataReconciliationJobInput,
) {
  if (input.paperRecordIds.length === 0) {
    return null;
  }

  const fingerprint = createHash("sha256")
    .update(input.paperRecordIds.slice().sort().join(","))
    .digest("hex");
  const idempotencyKey = createIdempotencyKey(
    input.organizationId,
    JOB_TYPES.metadataReconciliation,
    fingerprint,
  );

  const existing = await findBackgroundJobByIdempotencyKey(idempotencyKey);
  if (existing && existing.status !== "FAILED") {
    return { jobId: existing.id, status: existing.status };
  }

  const job = await createBackgroundJob({
    organizationId: input.organizationId,
    userId: input.requestedByUserId,
    type: JOB_TYPES.metadataReconciliation,
    idempotencyKey,
    payload: { paperRecordIds: input.paperRecordIds },
  });

  await enqueueJob({
    id: job.id,
    type: JOB_TYPES.metadataReconciliation,
    organizationId: input.organizationId,
    requestedByUserId: input.requestedByUserId,
    requestedAt: new Date().toISOString(),
    payload: {
      jobId: job.id,
      paperRecordIds: input.paperRecordIds,
    },
  });

  return { jobId: job.id, status: job.status };
}
