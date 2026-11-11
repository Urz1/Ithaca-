import { del, put } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";

function safePathSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9._-]/g, "_");
}

const LOCAL_STORAGE_DIR = path.join(process.cwd(), ".cache", "artifacts");

export async function storeOrganizationArtifact(options: {
  organizationId: string;
  artifactId: string;
  filename: string;
  body: Blob | Buffer | ReadableStream | string;
  contentType: string;
}): Promise<{ url: string; pathname: string }> {
  const pathname = [
    "organizations",
    safePathSegment(options.organizationId),
    safePathSegment(options.artifactId),
    safePathSegment(options.filename),
  ].join("/");

  // 1. If Vercel Blob token is configured, use it
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(pathname, options.body, {
      access: "private",
      addRandomSuffix: false,
      contentType: options.contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return { url: blob.url, pathname: blob.pathname };
  }

  // 2. Resilient Local Disk Storage Fallback
  const targetDir = path.join(
    LOCAL_STORAGE_DIR,
    safePathSegment(options.organizationId),
    safePathSegment(options.artifactId),
  );
  await fs.mkdir(targetDir, { recursive: true });
  const localFilePath = path.join(targetDir, safePathSegment(options.filename));

  let dataBuffer: Buffer;
  if (Buffer.isBuffer(options.body)) {
    dataBuffer = options.body;
  } else if (typeof options.body === "string") {
    dataBuffer = Buffer.from(options.body, "utf8");
  } else if (options.body instanceof Blob) {
    const arrayBuffer = await options.body.arrayBuffer();
    dataBuffer = Buffer.from(arrayBuffer);
  } else {
    // ReadableStream
    const reader = (options.body as ReadableStream<Uint8Array>).getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    dataBuffer = Buffer.concat(chunks);
  }

  await fs.writeFile(localFilePath, dataBuffer);
  return {
    url: `local://${localFilePath}`,
    pathname,
  };
}

export async function deleteArtifact(url: string): Promise<void> {
  if (url.startsWith("local://")) {
    const localFilePath = url.replace("local://", "");
    try {
      await fs.unlink(localFilePath);
    } catch {
      // Ignore if already deleted
    }
    return;
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN });
}
