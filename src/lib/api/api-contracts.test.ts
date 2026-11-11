import { describe, expect, it } from "vitest";
import {
  apiError,
  apiSuccess,
  createApiContext,
  getRequestId,
} from "./api-contracts";

describe("API request IDs", () => {
  it("preserves a valid caller-provided request ID", () => {
    const headers = new Headers({ "x-request-id": "client-request_123" });

    expect(getRequestId(headers)).toBe("client-request_123");
    expect(createApiContext({ headers })).toEqual({
      requestId: "client-request_123",
    });
  });

  it("generates an ID when the supplied value is unsafe", () => {
    const requestId = getRequestId(
      new Headers({ "x-request-id": "invalid request id" }),
    );

    expect(requestId).not.toBe("invalid request id");
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

describe("API response contracts", () => {
  const context = { requestId: "request-42" };

  it("adds request metadata without replacing success fields", async () => {
    const response = apiSuccess({ summary: "Concise result" }, context);

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBe("request-42");
    await expect(response.json()).resolves.toEqual({
      summary: "Concise result",
      requestId: "request-42",
    });
  });

  it("maps error codes to statuses and retains optional details", async () => {
    const response = apiError(
      "RATE_LIMIT_EXCEEDED",
      "Rate limit exceeded",
      context,
      {
        retryAfterSeconds: 12,
        details: { endpoint: "chat" },
        headers: { "Retry-After": "12" },
      },
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("x-request-id")).toBe("request-42");
    expect(response.headers.get("retry-after")).toBe("12");
    await expect(response.json()).resolves.toEqual({
      error: "Rate limit exceeded",
      code: "RATE_LIMIT_EXCEEDED",
      requestId: "request-42",
      retryAfterSeconds: 12,
      details: { endpoint: "chat" },
    });
  });
});
