"use server";

import { randomUUID } from "node:crypto";
import { JobStatus } from "@prisma/client";
import {
  getBackgroundJobForOrganization,
  isTerminalJobStatus,
} from "@/modules/jobs/job-service";
import {
  isDurableJobsConfigured,
  isDurableJobsEnabled,
  shouldUseDurableGraphExport,
} from "@/modules/jobs/job-runtime";
import { requireOrganizationContext } from "@/lib/organization-context";
import { PLATFORM_LIMITS, enforceMaximum } from "@/lib/platform/limits";
import { submitGraphExportJob } from "@/modules/jobs/graph-export-job";

export interface JobCapabilities {
  durableJobsEnabled: boolean;
  durableJobsConfigured: boolean;
  maxNodesSynchronous: number;
  maxExportBytes: number;
}

export interface BackgroundJobStatus {
  id: string;
  type: string;
  status: string;
  errorMessage?: string | null;
  artifact?: {
    id: string;
    filename: string;
    contentType: string;
    sizeBytes: number | null;
    expiresAt: string | null;
  };
  completedAt?: string | null;
}

export async function getJobCapabilities(): Promise<JobCapabilities> {
  return {
    durableJobsEnabled: isDurableJobsEnabled(),
    durableJobsConfigured: isDurableJobsConfigured(),
    maxNodesSynchronous: PLATFORM_LIMITS.exports.maxNodesSynchronous,
    maxExportBytes: PLATFORM_LIMITS.imports.maxBytes,
  };
}

export async function shouldRouteExportThroughQueue(
  nodeCount: number,
): Promise<boolean> {
  return shouldUseDurableGraphExport(nodeCount);
}

export async function submitDurableGraphExport(input: {
  filename: string;
  content: string;
  contentType: string;
  encoding?: "utf8" | "base64";
  nodeCount: number;
}): Promise<{ jobId: string; status: string }> {
  const context = await requireOrganizationContext("domain:write");
  if (!shouldUseDurableGraphExport(input.nodeCount)) {
    throw new Error("This export is small enough to download directly");
  }

  const byteLimit = enforceMaximum(
    Buffer.byteLength(
      input.content,
      input.encoding === "base64" ? "base64" : "utf8",
    ),
    PLATFORM_LIMITS.imports.maxBytes,
    "Export payload",
  );
  if (!byteLimit.allowed) {
    throw new Error(byteLimit.message);
  }

  return submitGraphExportJob({
    organizationId: context.organizationId,
    requestedByUserId: context.userId,
    artifactId: randomUUID(),
    filename: input.filename,
    content: input.content,
    contentType: input.contentType,
    encoding: input.encoding,
  });
}

export async function getBackgroundJobStatus(
  jobId: string,
): Promise<BackgroundJobStatus | null> {
  const context = await requireOrganizationContext("domain:read");
  const job = await getBackgroundJobForOrganization(
    jobId,
    context.organizationId,
  );
  if (!job) return null;

  return {
    id: job.id,
    type: job.type,
    status: job.status,
    errorMessage: job.errorMessage,
    completedAt: job.completedAt?.toISOString() ?? null,
    artifact: job.artifact
      ? {
          id: job.artifact.id,
          filename: job.artifact.filename,
          contentType: job.artifact.contentType,
          sizeBytes: job.artifact.sizeBytes,
          expiresAt: job.artifact.expiresAt?.toISOString() ?? null,
        }
      : undefined,
  };
}

export async function waitForBackgroundJob(
  jobId: string,
  timeoutMs = 120_000,
): Promise<BackgroundJobStatus | null> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const status = await getBackgroundJobStatus(jobId);
    if (!status) return null;
    if (isTerminalJobStatus(status.status as JobStatus)) {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return getBackgroundJobStatus(jobId);
}
