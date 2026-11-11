import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { apiError, type ApiRequestContext } from "@/lib/api/api-contracts";
import { checkDistributedLimit, getRedis } from "@/lib/platform/redis";

const WINDOW_MS = 60_000; // 1-minute sliding window

export interface AuthResult {
  session: { userId: string };
  user: { id: string; email: string; name: string | null };
}

interface RateLimitRecord {
  count: number;
  windowStart: Date;
}

export type RateLimitDecision =
  | { action: "reset" }
  | { action: "increment" }
  | { action: "reject"; retryAfterSeconds: number };

export function evaluateRateLimit(
  record: RateLimitRecord | null,
  maxPerMinute: number,
  now: Date,
): RateLimitDecision {
  const windowStart = new Date(now.getTime() - WINDOW_MS);

  if (!record || record.windowStart < windowStart) {
    return { action: "reset" };
  }

  if (record.count >= maxPerMinute) {
    const resetAt = new Date(record.windowStart.getTime() + WINDOW_MS);
    return {
      action: "reject",
      retryAfterSeconds: Math.max(
        0,
        Math.ceil((resetAt.getTime() - now.getTime()) / 1000),
      ),
    };
  }

  return { action: "increment" };
}

/**
 * Verify the request has a valid session. Returns the session/user
 * or a 401 NextResponse if unauthenticated.
 */
export async function requireApiAuth(
  request: NextRequest,
  context: ApiRequestContext,
): Promise<AuthResult | NextResponse> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user?.id) {
    return apiError(
      "AUTHENTICATION_REQUIRED",
      "Authentication required",
      context,
    );
  }

  return {
    session: { userId: session.user.id },
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    },
  };
}

/**
 * Optional session check. Returns AuthResult if authenticated, or null if unauthenticated.
 */
export async function getOptionalApiAuth(
  request: NextRequest,
): Promise<AuthResult | null> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user?.id) {
      return null;
    }

    return {
      session: { userId: session.user.id },
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
      },
    };
  } catch {
    return null;
  }
}

/**
 * Database-backed rate limiter. Uses a per-user per-endpoint counter
 * with a 1-minute sliding window. Works correctly on serverless
 * because the state lives in Postgres, not in-memory.
 *
 * Returns null if allowed, or a 429 NextResponse if rate-limited.
 */
async function resolveRateLimitOrganizationId(
  userId: string,
  organizationId?: string | null,
): Promise<string | null> {
  if (organizationId) return organizationId;

  const personal = await prisma.organization.findFirst({
    where: { personalOwnerId: userId },
    select: { id: true },
  });
  if (personal) return personal.id;

  const membership = await prisma.membership.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

export async function checkApiRateLimit(
  userId: string,
  endpoint: string,
  maxPerMinute: number,
  context: ApiRequestContext,
  organizationId?: string | null,
): Promise<NextResponse | null> {
  const now = new Date();

  try {
    if (getRedis()) {
      try {
        const distributed = await checkDistributedLimit({
          key: `rate-limit:${userId}:${endpoint}:${Math.floor(now.getTime() / WINDOW_MS)}`,
          maximum: maxPerMinute,
          windowSeconds: WINDOW_MS / 1000,
        });
        if (!distributed.allowed) {
          return apiError(
            "RATE_LIMIT_EXCEEDED",
            "Rate limit exceeded",
            context,
            {
              retryAfterSeconds: WINDOW_MS / 1000,
              headers: { "Retry-After": String(WINDOW_MS / 1000) },
            },
          );
        }
        return null;
      } catch (error) {
        console.warn(
          "[rate-limit] Redis unavailable, falling back to Postgres",
          error,
        );
      }
    }

    const resolvedOrganizationId = await resolveRateLimitOrganizationId(
      userId,
      organizationId,
    );
    if (!resolvedOrganizationId) {
      console.warn(
        "[rate-limit] No organization context for user, skipping DB limiter",
      );
      return null;
    }

    const record = await prisma.apiRateLimit.findUnique({
      where: { userId_endpoint: { userId, endpoint } },
    });
    const decision = evaluateRateLimit(record, maxPerMinute, now);

    if (decision.action === "reset") {
      await prisma.apiRateLimit.upsert({
        where: { userId_endpoint: { userId, endpoint } },
        update: { count: 1, windowStart: now },
        create: {
          userId,
          endpoint,
          organizationId: resolvedOrganizationId,
          count: 1,
          windowStart: now,
        },
      });
      return null;
    }

    if (decision.action === "reject") {
      return apiError("RATE_LIMIT_EXCEEDED", "Rate limit exceeded", context, {
        retryAfterSeconds: decision.retryAfterSeconds,
        headers: { "Retry-After": String(decision.retryAfterSeconds) },
      });
    }

    await prisma.apiRateLimit.update({
      where: { userId_endpoint: { userId, endpoint } },
      data: { count: { increment: 1 } },
    });

    return null;
  } catch (error) {
    console.error("[rate-limit] DB error, blocking request:", error);
    return apiError(
      "SERVICE_UNAVAILABLE",
      "Service temporarily unavailable",
      context,
      {
        headers: { "Retry-After": "5" },
      },
    );
  }
}

/**
 * Type guard: returns true if the value is a NextResponse (auth/rate-limit rejection).
 */
export function isRejection(value: unknown): value is NextResponse {
  return value instanceof NextResponse;
}
