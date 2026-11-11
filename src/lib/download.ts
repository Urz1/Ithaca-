/**
 * Browser file download helper
 *
 * Ensures downloads reliably trigger across all modern browsers:
 * 1. Attaches temporary <a> element to document.body (required by Chromium/WebKit security models)
 * 2. Clicks the anchor element
 * 3. Safely cleans up the DOM node and revokes object URLs asynchronously
 *    after a delay to prevent cancelling the download before the browser fetches the blob data.
 */

export function triggerFileDownload(url: string, filename: string): void {
  if (typeof document === "undefined") return;

  const anchor = document.createElement("a");
  anchor.style.display = "none";
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener noreferrer";

  document.body.appendChild(anchor);

  try {
    anchor.click();
  } finally {
    // Delay removal and blob revocation so the browser download manager
    // has adequate time to consume the stream without premature teardown.
    setTimeout(() => {
      try {
        if (anchor.parentNode) {
          anchor.parentNode.removeChild(anchor);
        }
        if (url.startsWith("blob:") && typeof URL.revokeObjectURL === "function") {
          URL.revokeObjectURL(url);
        }
      } catch {
        // Ignore teardown errors
      }
    }, 2500);
  }
}

/**
 * Creates a Blob, generates an object URL, and triggers an asynchronous download.
 */
export function downloadBlob(
  content: BlobPart | BlobPart[],
  filename: string,
  mimeType: string = "application/octet-stream",
): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const parts = Array.isArray(content) ? content : [content];
  const blob = content instanceof Blob ? content : new Blob(parts, { type: mimeType });
  const url = URL.createObjectURL(blob);

  triggerFileDownload(url, filename);
}
