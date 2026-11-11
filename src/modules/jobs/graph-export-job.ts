import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { artifactExpiryDate } from "./job-runtime";
import { createIdempotencyKey, JOB_TYPES } from "./job-policy";
import {
  createBackgroundJob,
  findBackgroundJobByIdempotencyKey,
} from "./job-service";
import { enqueueJob } from "./queue";

export interface GraphExportJobInput {
  organizationId: string;
  requestedByUserId: string;
  artifactId: string;
  filename: string;
  content: string;
  contentType: string;
  encoding?: "utf8" | "base64";
}

export async function submitGraphExportJob(input: GraphExportJobInput) {
  const fingerprint = createHash("sha256")
    .update(
      `${input.organizationId}:${input.artifactId}:${input.filename}:${input.contentType}:${input.content.length}`,
    )
    .digest("hex");
  const idempotencyKey = createIdempotencyKey(
    input.organizationId,
    JOB_TYPES.graphExport,
    fingerprint,
  );

  const existing = await findBackgroundJobByIdempotencyKey(idempotencyKey);
  if (existing && existing.status !== "FAILED") {
    return { jobId: existing.id, status: existing.status };
  }

  const job = await createBackgroundJob({
    organizationId: input.organizationId,
    userId: input.requestedByUserId,
    type: JOB_TYPES.graphExport,
    idempotencyKey,
    payload: {
      artifactId: input.artifactId,
      filename: input.filename,
      contentType: input.contentType,
      encoding: input.encoding ?? "utf8",
      nodeFingerprint: fingerprint,
    },
  });

  await enqueueJob({
    id: job.id,
    type: JOB_TYPES.graphExport,
    organizationId: input.organizationId,
    requestedByUserId: input.requestedByUserId,
    requestedAt: new Date().toISOString(),
    payload: {
      jobId: job.id,
      artifactId: input.artifactId,
      filename: input.filename,
      content: input.content,
      contentType: input.contentType,
      encoding: input.encoding ?? "utf8",
    },
  });

  return { jobId: job.id, status: job.status };
}

export async function persistStoredArtifact(input: {
  organizationId: string;
  artifactId: string;
  filename: string;
  contentType: string;
  pathname: string;
  url: string;
  sizeBytes: number;
}) {
  return prisma.storedArtifact.upsert({
    where: { id: input.artifactId },
    update: {
      filename: input.filename,
      contentType: input.contentType,
      pathname: input.pathname,
      url: input.url,
      sizeBytes: input.sizeBytes,
      expiresAt: artifactExpiryDate(),
    },
    create: {
      id: input.artifactId,
      organizationId: input.organizationId,
      filename: input.filename,
      contentType: input.contentType,
      pathname: input.pathname,
      url: input.url,
      sizeBytes: input.sizeBytes,
      expiresAt: artifactExpiryDate(),
    },
  });
}
