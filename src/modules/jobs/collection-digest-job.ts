import { createHash } from "node:crypto";
import { createIdempotencyKey, JOB_TYPES } from "./job-policy";
import {
  createBackgroundJob,
  findBackgroundJobByIdempotencyKey,
} from "./job-service";
import { enqueueJob } from "./queue";

export async function enqueueCollectionDigest(input: {
  organizationId: string;
  requestedByUserId: string;
  collectionIds?: string[];
}) {
  const fingerprint = createHash("sha256")
    .update(
      [
        input.organizationId,
        ...(input.collectionIds ?? []).slice().sort(),
        new Date().toISOString().slice(0, 10),
      ].join("|"),
    )
    .digest("hex");

  const idempotencyKey = createIdempotencyKey(
    input.organizationId,
    JOB_TYPES.savedSearchAlert,
    fingerprint,
  );

  const existing = await findBackgroundJobByIdempotencyKey(idempotencyKey);
  if (existing && existing.status !== "FAILED") {
    return { jobId: existing.id, status: existing.status };
  }

  const job = await createBackgroundJob({
    organizationId: input.organizationId,
    userId: input.requestedByUserId,
    type: JOB_TYPES.savedSearchAlert,
    idempotencyKey,
    payload: {
      collectionIds: input.collectionIds ?? [],
    },
  });

  await enqueueJob({
    id: job.id,
    type: JOB_TYPES.savedSearchAlert,
    organizationId: input.organizationId,
    requestedByUserId: input.requestedByUserId,
    requestedAt: new Date().toISOString(),
    payload: {
      jobId: job.id,
      collectionIds: input.collectionIds ?? [],
    },
  });

  return { jobId: job.id, status: job.status };
}
