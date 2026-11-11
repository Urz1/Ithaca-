import type { ApiRequestContext } from "@/lib/api/api-contracts";
import { logEvent } from "@/lib/platform/telemetry";

export async function withApiTelemetry<T>(
  context: ApiRequestContext,
  options: {
    route: string;
    userId?: string;
    organizationId?: string;
  },
  handler: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  try {
    const result = await handler();
    logEvent("info", "api.request.completed", {
      requestId: context.requestId,
      userId: options.userId,
      organizationId: options.organizationId,
      attributes: {
        route: options.route,
        durationMs: Date.now() - started,
      },
    });
    return result;
  } catch (error) {
    logEvent("error", "api.request.failed", {
      requestId: context.requestId,
      userId: options.userId,
      organizationId: options.organizationId,
      attributes: {
        route: options.route,
        durationMs: Date.now() - started,
        message: error instanceof Error ? error.message : "unknown",
      },
    });
    throw error;
  }
}
