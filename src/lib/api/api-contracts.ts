import { NextResponse } from "next/server";

export const API_ERROR_STATUS = {
  INVALID_REQUEST: 400,
  AUTHENTICATION_REQUIRED: 401,
  RATE_LIMIT_EXCEEDED: 429,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

export type ApiErrorCode = keyof typeof API_ERROR_STATUS;

export interface ApiRequestContext {
  requestId: string;
}

export type ApiSuccess<T extends Record<string, unknown>> = T & {
  requestId: string;
};

export interface ApiError {
  error: string;
  code: ApiErrorCode;
  requestId: string;
  details?: unknown;
  retryAfterSeconds?: number;
}

interface ApiErrorOptions {
  details?: unknown;
  headers?: HeadersInit;
  retryAfterSeconds?: number;
}

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function getRequestId(headers: Pick<Headers, "get">): string {
  const suppliedRequestId = headers.get("x-request-id")?.trim();

  if (suppliedRequestId && REQUEST_ID_PATTERN.test(suppliedRequestId)) {
    return suppliedRequestId;
  }

  return crypto.randomUUID();
}

export function createApiContext(request: {
  headers: Pick<Headers, "get">;
}): ApiRequestContext {
  return { requestId: getRequestId(request.headers) };
}

export function apiSuccess<T extends Record<string, unknown>>(
  data: T,
  context: ApiRequestContext,
  init?: ResponseInit,
): NextResponse<ApiSuccess<T>> {
  const headers = new Headers(init?.headers);
  headers.set("x-request-id", context.requestId);

  return NextResponse.json(
    { ...data, requestId: context.requestId },
    { ...init, headers },
  );
}

export function apiError(
  code: ApiErrorCode,
  error: string,
  context: ApiRequestContext,
  options: ApiErrorOptions = {},
): NextResponse<ApiError> {
  const headers = new Headers(options.headers);
  headers.set("x-request-id", context.requestId);

  return NextResponse.json(
    {
      error,
      code,
      requestId: context.requestId,
      ...(options.details === undefined ? {} : { details: options.details }),
      ...(options.retryAfterSeconds === undefined
        ? {}
        : { retryAfterSeconds: options.retryAfterSeconds }),
    },
    { status: API_ERROR_STATUS[code], headers },
  );
}
