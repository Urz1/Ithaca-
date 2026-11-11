import { NextRequest } from "next/server";
import { z } from "zod";
import {
  apiError,
  apiSuccess,
  createApiContext,
} from "@/lib/api/api-contracts";
import {
  checkApiRateLimit,
  isRejection,
  requireApiAuth,
} from "@/lib/api/api-auth";
import {
  getOrganizationContext,
  recordAuditEvent,
  requireOrganizationContext,
} from "@/lib/organization-context";
import { prisma } from "@/lib/prisma";
import { AuthorizationError } from "@/lib/tenancy-policy";

const listSchema = z.object({
  citingId: z.string().min(1),
  citedId: z.string().min(1),
});

const createSchema = listSchema.extend({
  body: z.string().trim().min(1).max(2000),
  edgeType: z
    .enum(["supports", "contradicts", "extends", "cites", "unknown"])
    .optional(),
});

export async function GET(request: NextRequest) {
  const context = createApiContext(request);
  const authResult = await requireApiAuth(request, context);
  if (isRejection(authResult)) return authResult;

  const org = await getOrganizationContext();
  if (!org) {
    return apiError(
      "AUTHENTICATION_REQUIRED",
      "Organization required",
      context,
    );
  }

  const parsed = listSchema.safeParse({
    citingId: request.nextUrl.searchParams.get("citingId"),
    citedId: request.nextUrl.searchParams.get("citedId"),
  });
  if (!parsed.success) {
    return apiError(
      "INVALID_REQUEST",
      "citingId and citedId are required",
      context,
    );
  }

  const comments = await prisma.edgeComment.findMany({
    where: {
      organizationId: org.organizationId,
      citingId: parsed.data.citingId,
      citedId: parsed.data.citedId,
    },
    include: {
      actor: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return apiSuccess(
    {
      comments: comments.map((comment) => ({
        id: comment.id,
        body: comment.body,
        edgeType: comment.edgeType,
        createdAt: comment.createdAt.toISOString(),
        actor: {
          id: comment.actor.id,
          name: comment.actor.name ?? "Researcher",
        },
      })),
    },
    context,
  );
}

export async function POST(request: NextRequest) {
  const context = createApiContext(request);
  const authResult = await requireApiAuth(request, context);
  if (isRejection(authResult)) return authResult;

  const rateLimited = await checkApiRateLimit(
    authResult.user.id,
    "edge-comment",
    60,
    context,
  );
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("INVALID_REQUEST", "Invalid comment", context, {
        details: parsed.error.flatten(),
      });
    }

    const org = await requireOrganizationContext("domain:write");
    const comment = await prisma.edgeComment.create({
      data: {
        organizationId: org.organizationId,
        actorId: org.userId,
        citingId: parsed.data.citingId,
        citedId: parsed.data.citedId,
        body: parsed.data.body,
        edgeType: parsed.data.edgeType,
      },
      include: {
        actor: { select: { id: true, name: true } },
      },
    });

    await recordAuditEvent(org, {
      action: "edge.comment_added",
      entityType: "EdgeComment",
      entityId: comment.id,
      metadata: {
        citingId: parsed.data.citingId,
        citedId: parsed.data.citedId,
      },
    });

    return apiSuccess(
      {
        comment: {
          id: comment.id,
          body: comment.body,
          edgeType: comment.edgeType,
          createdAt: comment.createdAt.toISOString(),
          actor: {
            id: comment.actor.id,
            name: comment.actor.name ?? "Researcher",
          },
        },
      },
      context,
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError("AUTHENTICATION_REQUIRED", error.message, context);
    }
    console.error("[edges/comments] Error:", error);
    return apiError("INTERNAL_ERROR", "Failed to save comment", context);
  }
}
