import { JobStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { JobType } from "./job-policy";

export interface CreateBackgroundJobInput {
  organizationId: string;
  userId: string;
  type: JobType;
  idempotencyKey: string;
  payload?: Prisma.InputJsonValue;
}

export async function createBackgroundJob(input: CreateBackgroundJobInput) {
  return prisma.backgroundJob.upsert({
    where: { idempotencyKey: input.idempotencyKey },
    update: {
      status: "QUEUED",
      payload: input.payload,
      errorMessage: null,
      result: Prisma.JsonNull,
      completedAt: null,
    },
    create: {
      organizationId: input.organizationId,
      userId: input.userId,
      type: input.type,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload,
    },
  });
}

export async function markBackgroundJobProcessing(jobId: string) {
  return prisma.backgroundJob.update({
    where: { id: jobId },
    data: { status: "PROCESSING" },
  });
}

export async function markBackgroundJobCompleted(
  jobId: string,
  result: Prisma.InputJsonValue,
  artifactId?: string,
) {
  return prisma.backgroundJob.update({
    where: { id: jobId },
    data: {
      status: "COMPLETED",
      result,
      artifactId,
      completedAt: new Date(),
      errorMessage: null,
    },
  });
}

export async function markBackgroundJobFailed(
  jobId: string,
  errorMessage: string,
) {
  return prisma.backgroundJob.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      errorMessage,
      completedAt: new Date(),
    },
  });
}

export async function getBackgroundJobForOrganization(
  jobId: string,
  organizationId: string,
) {
  return prisma.backgroundJob.findFirst({
    where: { id: jobId, organizationId },
    include: {
      artifact: {
        select: {
          id: true,
          filename: true,
          contentType: true,
          sizeBytes: true,
          expiresAt: true,
          createdAt: true,
        },
      },
    },
  });
}

export async function findBackgroundJobByIdempotencyKey(
  idempotencyKey: string,
) {
  return prisma.backgroundJob.findUnique({
    where: { idempotencyKey },
    include: { artifact: true },
  });
}

export function isTerminalJobStatus(status: JobStatus): boolean {
  return status === "COMPLETED" || status === "FAILED";
}
