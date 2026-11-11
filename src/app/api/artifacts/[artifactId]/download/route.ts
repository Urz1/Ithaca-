import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { apiError, createApiContext } from "@/lib/api/api-contracts";
import { isRejection, requireApiAuth } from "@/lib/api/api-auth";
import { getOrganizationContext } from "@/lib/organization-context";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ artifactId: string }> },
) {
  const context = createApiContext(request);
  const auth = await requireApiAuth(request, context);
  if (isRejection(auth)) return auth;

  const orgContext = await getOrganizationContext();
  if (!orgContext) {
    return apiError(
      "AUTHENTICATION_REQUIRED",
      "Organization context required",
      context,
    );
  }

  const { artifactId } = await params;
  const artifact = await prisma.storedArtifact.findFirst({
    where: {
      id: artifactId,
      organizationId: orgContext.organizationId,
    },
  });

  if (!artifact) {
    return apiError("INVALID_REQUEST", "Artifact not found", context);
  }

  if (artifact.expiresAt && artifact.expiresAt.getTime() <= Date.now()) {
    return apiError("INVALID_REQUEST", "Artifact has expired", context);
  }

  // 1. Handle local disk storage fallback
  if (artifact.url.startsWith("local://")) {
    const localPath = artifact.url.replace("local://", "");
    try {
      const fs = await import("node:fs/promises");
      const fileBuffer = await fs.readFile(localPath);
      const headers = new Headers();
      headers.set("Content-Type", artifact.contentType);
      headers.set(
        "Content-Disposition",
        `attachment; filename="${artifact.filename.replace(/"/g, "")}"`,
      );
      headers.set("x-request-id", context.requestId);
      return new NextResponse(fileBuffer, { headers });
    } catch {
      return apiError(
        "INVALID_REQUEST",
        "Artifact local file not found",
        context,
      );
    }
  }

  // 2. Handle Vercel Blob storage
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return apiError(
      "SERVICE_UNAVAILABLE",
      "Object storage is not configured",
      context,
    );
  }

  const blob = await get(artifact.url, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  if (!blob) {
    return apiError("INVALID_REQUEST", "Artifact blob not found", context);
  }

  const headers = new Headers();
  headers.set("Content-Type", artifact.contentType);
  headers.set(
    "Content-Disposition",
    `attachment; filename="${artifact.filename.replace(/"/g, "")}"`,
  );
  headers.set("x-request-id", context.requestId);

  return new NextResponse(blob.stream, { headers });
}
