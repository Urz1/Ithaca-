type LogLevel = "debug" | "info" | "warn" | "error";
type AttributeValue = string | number | boolean | null | undefined;

export interface TelemetryContext {
  requestId?: string;
  jobId?: string;
  userId?: string;
  organizationId?: string;
  attributes?: Record<string, AttributeValue>;
}

const SENSITIVE_KEYS = /authorization|cookie|password|secret|token|api.?key/i;

function sanitizeAttributes(
  attributes: Record<string, AttributeValue> = {},
): Record<string, AttributeValue> {
  return Object.fromEntries(
    Object.entries(attributes).map(([key, value]) => [
      key,
      SENSITIVE_KEYS.test(key) ? "[REDACTED]" : value,
    ]),
  );
}

export function createRequestId(headers: Headers): string {
  return headers.get("x-request-id") ?? crypto.randomUUID();
}

export function logEvent(
  level: LogLevel,
  event: string,
  context: TelemetryContext = {},
): void {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    requestId: context.requestId,
    jobId: context.jobId,
    userId: context.userId,
    organizationId: context.organizationId,
    ...sanitizeAttributes(context.attributes),
  };

  const serialized = JSON.stringify(payload);
  if (level === "error") console.error(serialized);
  else if (level === "warn") console.warn(serialized);
  else if (level === "debug") console.debug(serialized);
  else console.info(serialized);
}
