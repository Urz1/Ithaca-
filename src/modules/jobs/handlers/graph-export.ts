import { storeOrganizationArtifact } from "@/lib/platform/artifact-storage";
import {
  emitProductEventForOrganization,
  PRODUCT_EVENTS,
} from "@/lib/platform/product-events";
import {
  markBackgroundJobCompleted,
  markBackgroundJobFailed,
  markBackgroundJobProcessing,
} from "../job-service";
import { persistStoredArtifact } from "../graph-export-job";

function decodeJobContent(
  content: string,
  encoding: "utf8" | "base64",
): Buffer | string {
  if (encoding === "base64") {
    return Buffer.from(content, "base64");
  }
  return content;
}

export async function processGraphExportJob(input: {
  jobId: string;
  organizationId: string;
  requestedByUserId: string;
  artifactId: string;
  filename: string;
  content: string;
  contentType: string;
  encoding?: "utf8" | "base64";
}) {
  await markBackgroundJobProcessing(input.jobId);

  try {
    const body = decodeJobContent(input.content, input.encoding ?? "utf8");
    const stored = await storeOrganizationArtifact({
      organizationId: input.organizationId,
      artifactId: input.artifactId,
      filename: input.filename,
      body,
      contentType: input.contentType,
    });

    const sizeBytes = Buffer.isBuffer(body)
      ? body.byteLength
      : Buffer.byteLength(body, "utf8");

    const artifact = await persistStoredArtifact({
      organizationId: input.organizationId,
      artifactId: input.artifactId,
      filename: input.filename,
      contentType: input.contentType,
      pathname: stored.pathname,
      url: stored.url,
      sizeBytes,
    });

    await markBackgroundJobCompleted(
      input.jobId,
      {
        artifactId: artifact.id,
        pathname: stored.pathname,
        sizeBytes,
      },
      artifact.id,
    );

    await emitProductEventForOrganization(
      {
        name: PRODUCT_EVENTS.exportCompleted,
        anonymousId: input.requestedByUserId,
        properties: {
          format: input.contentType,
          sizeBytes,
          durable: true,
        },
      },
      input.organizationId,
    );

    return { artifactUrl: stored.url, artifactId: artifact.id };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Graph export job failed";
    await markBackgroundJobFailed(input.jobId, message);
    throw error;
  }
}
