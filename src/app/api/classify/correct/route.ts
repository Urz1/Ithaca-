/**
 * Citation Correction API Route
 *
 * POST /api/classify/correct
 * Body: { citingId, citedId, edgeType, comment? }
 *
 * Persists a user correction to the CitationCache, overriding the LLM
 * classification with provider "user-correction" and a high classifier version
 * so it won't be overwritten by future re-classifications.
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  apiError,
  apiSuccess,
  createApiContext,
} from "@/lib/api/api-contracts";
import {
  requireApiAuth,
  checkApiRateLimit,
  isRejection,
} from "@/lib/api/api-auth";
import {
  getOrganizationContext,
  recordAuditEvent,
  requireOrganizationContext,
} from "@/lib/organization-context";
import { USER_CORRECTION_VERSION } from "@/lib/api/citation-classifier";
import { buildAiProvenance } from "@/modules/ai/provenance";
import {
  emitProductEventForOrganization,
  PRODUCT_EVENTS,
} from "@/lib/platform/product-events";
import { AuthorizationError } from "@/lib/tenancy-policy";

const correctionSchema = z.object({
  citingId: z.string().min(1),
  citedId: z.string().min(1),
  edgeType: z.enum(["supports", "contradicts", "extends", "cites", "unknown"]),
  comment: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const context = createApiContext(request);
  const authResult = await requireApiAuth(request, context);
  if (isRejection(authResult)) return authResult;

  const rateLimited = await checkApiRateLimit(
    authResult.user.id,
    "correct",
    60,
    context,
  );
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const parsed = correctionSchema.safeParse(body);

    if (!parsed.success) {
      return apiError("INVALID_REQUEST", "Invalid request", context, {
        details: parsed.error.flatten(),
      });
    }

    await requireOrganizationContext("domain:write");

    const { citingId, citedId, edgeType, comment } = parsed.data;

    const result = await prisma.citationCache.upsert({
      where: {
        citingId_citedId: { citingId, citedId },
      },
      update: {
        edgeType,
        confidence: 1.0,
        snippet: comment
          ? `User correction: ${comment}`
          : `User corrected relationship to "${edgeType}".`,
        provider: "user-correction",
        isCalibrated: true,
        reviewerId: authResult.user.id,
        calibrationFeedback: comment ?? null,
        classifierVersion: USER_CORRECTION_VERSION,
      },
      create: {
        citingId,
        citedId,
        edgeType,
        confidence: 1.0,
        snippet: comment
          ? `User correction: ${comment}`
          : `User corrected relationship to "${edgeType}".`,
        provider: "user-correction",
        isCalibrated: true,
        reviewerId: authResult.user.id,
        calibrationFeedback: comment ?? null,
        classifierVersion: USER_CORRECTION_VERSION,
      },
    });

    const orgContext = await getOrganizationContext();
    if (orgContext) {
      await recordAuditEvent(orgContext, {
        action: "ai.correction_saved",
        entityType: "CitationCache",
        entityId: result.id,
        metadata: { citingId, citedId, edgeType },
      });

      await emitProductEventForOrganization(
        {
          name: PRODUCT_EVENTS.evidenceReviewed,
          anonymousId: authResult.user.id,
          properties: { edgeType },
        },
        orgContext.organizationId,
      );
    }

    const provenance = buildAiProvenance({
      provider: "user-correction",
      model: "human-review",
      promptVersion: "user-correction-v1",
      classifierVersion: USER_CORRECTION_VERSION,
      sourceIds: [citingId, citedId],
      evidence: [comment ?? edgeType],
      confidence: 1,
      humanReviewed: true,
      reviewerId: authResult.user.id,
    });

    return apiSuccess(
      {
        success: true,
        id: result.id,
        edgeType: result.edgeType,
        provenance,
      },
      context,
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError("AUTHENTICATION_REQUIRED", error.message, context);
    }
    console.error("[classify/correct] Error:", error);
    return apiError("INTERNAL_ERROR", "Failed to persist correction", context);
  }
}

/**
 * GET /api/classify/correct
 *
 * Query or export the proprietary fine-tuning calibration dataset.
 * Supports standard JSON and JSONL (line-delimited) formats for direct ingestion
 * into machine learning fine-tuning pipelines.
 */
export async function GET(request: NextRequest) {
  const context = createApiContext(request);
  const authResult = await requireApiAuth(request, context);
  if (isRejection(authResult)) return authResult;

  const rateLimited = await checkApiRateLimit(
    authResult.user.id,
    "correct_get",
    60,
    context,
  );
  if (rateLimited) return rateLimited;

  try {
    await requireOrganizationContext("domain:read");

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "json";
    const edgeTypeFilter = searchParams.get("edgeType");
    const limit = Math.min(
      Math.max(1, Number(searchParams.get("limit")) || 100),
      1000,
    );
    const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

    const whereClause: {
      OR: Array<{ isCalibrated: boolean } | { provider: string }>;
      edgeType?: string;
    } = {
      OR: [{ isCalibrated: true }, { provider: "user-correction" }],
      ...(edgeTypeFilter ? { edgeType: edgeTypeFilter } : {}),
    };

    const [
      totalCalibrated,
      records,
      supportsCount,
      contradictsCount,
      extendsCount,
      citesCount,
    ] = await Promise.all([
      prisma.citationCache.count({ where: whereClause }),
      prisma.citationCache.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.citationCache.count({
        where: { ...whereClause, edgeType: "supports" },
      }),
      prisma.citationCache.count({
        where: { ...whereClause, edgeType: "contradicts" },
      }),
      prisma.citationCache.count({
        where: { ...whereClause, edgeType: "extends" },
      }),
      prisma.citationCache.count({
        where: { ...whereClause, edgeType: "cites" },
      }),
    ]);

    const formattedRecords = records.map((r) => {
      let parsedContexts: string[] = [];
      if (r.contexts) {
        try {
          parsedContexts = JSON.parse(r.contexts);
        } catch {}
      }
      return {
        id: r.id,
        citingId: r.citingId,
        citedId: r.citedId,
        expected: r.edgeType,
        confidence: r.confidence,
        snippet: r.snippet,
        contexts: parsedContexts,
        s2Intents: r.s2Intents ? r.s2Intents.split(",").filter(Boolean) : [],
        comment: r.calibrationFeedback,
        reviewerId: r.reviewerId,
        provider: r.provider,
        classifierVersion: r.classifierVersion,
        createdAt: r.createdAt.toISOString(),
      };
    });

    if (format === "jsonl") {
      const jsonlContent = formattedRecords
        .map((item) => JSON.stringify(item))
        .join("\n");
      return new Response(jsonlContent, {
        status: 200,
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Content-Disposition":
            'attachment; filename="ithaca-calibration-dataset.jsonl"',
        },
      });
    }

    return apiSuccess(
      {
        totalCalibrated,
        breakdown: {
          supports: supportsCount,
          contradicts: contradictsCount,
          extends: extendsCount,
          cites: citesCount,
        },
        records: formattedRecords,
        limit,
        offset,
      },
      context,
    );
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError("AUTHENTICATION_REQUIRED", error.message, context);
    }
    console.error("[classify/correct:GET] Error:", error);
    return apiError(
      "INTERNAL_ERROR",
      "Failed to retrieve calibration dataset",
      context,
    );
  }
}
