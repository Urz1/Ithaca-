import { describe, expect, it, vi } from "vitest";
import { createRequestId, logEvent } from "@/lib/platform/telemetry";

describe("telemetry", () => {
  it("preserves an inbound request ID", () => {
    expect(createRequestId(new Headers({ "x-request-id": "request-1" }))).toBe(
      "request-1",
    );
  });

  it("redacts sensitive attributes", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    logEvent("info", "request.completed", {
      requestId: "request-1",
      attributes: { status: 200, authorization: "Bearer secret" },
    });

    const payload = JSON.parse(String(info.mock.calls[0][0])) as Record<
      string,
      unknown
    >;
    expect(payload.status).toBe(200);
    expect(payload.authorization).toBe("[REDACTED]");
    info.mockRestore();
  });
});
