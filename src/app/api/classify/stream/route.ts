import { NextRequest } from "next/server";
import { z } from "zod";
import {
  classifyBatchStream,
  type ClassificationInput,
  type ClassificationResult,
} from "@/lib/api/citation-classifier";
import { getOptionalOrganizationContextFromRequest } from "@/lib/api/request-organization";
import { apiError, createApiContext } from "@/lib/api/api-contracts";
import {
  getOptionalApiAuth,
  checkApiRateLimit,
} from "@/lib/api/api-auth";
import {
  assertAiBudgetAvailable,
  recordAiUsage,
} from "@/lib/platform/ai-usage";
import { FEATURE_FLAGS } from "@/lib/platform/feature-flags";
import { isFeatureEnabledForOrganization } from "@/lib/platform/org-rollout";
import { PLATFORM_LIMITS } from "@/lib/platform/limits";
import {
  buildAiProvenance,
  CLASSIFIER_PROMPT_VERSION,
  containsPromptInjectionRisk,
} from "@/modules/ai/provenance";
import { recordAuditEvent } from "@/lib/organization-context";
import { AuthorizationError } from "@/lib/tenancy-policy";

const citationSchema = z.object({
  citingId: z.string().min(1),
  citedId: z.string().min(1),
  citingTitle: z.string().min(1),
  citingAbstract: z.string().default(""),
  citedTitle: z.string().min(1),
  citedAbstract: z.string().default(""),
  citationContexts: z.array(z.string()).optional(),
  s2Intents: z.array(z.string()).optional(),
  targetAuthorSurname: z.string().optional(),
  targetYear: z.number().optional(),
});

const requestSchema = z.object({
  citations: z
    .array(citationSchema)
    .min(1)
    .max(PLATFORM_LIMITS.ai.maxBatchSize),
});

export async function POST(request: NextRequest) {
  const context = createApiContext(request);
  const orgContext = await getOptionalOrganizationContextFromRequest(request);

  if (
    !(await isFeatureEnabledForOrganization(
      FEATURE_FLAGS.aiClassification,
      orgContext?.organizationId,
    ))
  ) {
    return apiError(
      "SERVICE_UNAVAILABLE",
      "AI classification is temporarily disabled",
      context,
    );
  }

  const authResult = await getOptionalApiAuth(request);
  if (!authResult) {
    return apiError(
      "AUTHENTICATION_REQUIRED",
      "Authentication required",
      context,
    );
  }
  const userId = authResult.user.id;

  const rateLimited = await checkApiRateLimit(
    userId,
    "classify",
    30,
    context,
    orgContext?.organizationId,
  );
  if (rateLimited) return rateLimited;

  let citations: ClassificationInput[];
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("INVALID_REQUEST", "Invalid request body", context);
    }

    citations = parsed.data.citations as ClassificationInput[];

    for (const citation of citations) {
      const untrustedText = [
        citation.citingTitle,
        citation.citedTitle,
        citation.citingAbstract,
        citation.citedAbstract,
        ...(citation.citationContexts ?? []),
      ].join("\n");
      if (containsPromptInjectionRisk(untrustedText)) {
        return apiError(
          "INVALID_REQUEST",
          "Unsupported instruction patterns in citation content",
          context,
        );
      }
    }

    if (orgContext) {
      await assertAiBudgetAvailable(
        orgContext.organizationId,
        orgContext.organization.maxAiRequests,
        citations.length,
      );
    }
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return apiError("RATE_LIMIT_EXCEEDED", error.message, context);
    }
    console.error("[/api/classify/stream] Validation error:", error);
    return apiError("INVALID_REQUEST", "Request validation failed", context);
  }

  const encoder = new TextEncoder();
  const allResults: ClassificationResult[] = [];

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      };

      try {
        const stats = await classifyBatchStream(
          citations,
          async (chunk) => {
            allResults.push(...chunk);
            sendEvent("chunk", chunk);
          },
          3,
          request.signal,
        );

        if (orgContext) {
          const newlyClassified = allResults.filter(
            (result) => !result.cached && result.provider !== "fallback",
          );
          if (newlyClassified.length > 0) {
            await recordAiUsage({
              organizationId: orgContext.organizationId,
              userId: orgContext.userId,
              operation: "classify",
              provider: newlyClassified[0]?.provider ?? "unknown",
              model: "citation-classifier",
              inputText: JSON.stringify(citations),
              outputText: JSON.stringify(allResults),
            }).catch((err) =>
              console.warn(
                "[/api/classify/stream] Usage recording error:",
                err,
              ),
            );

            await recordAuditEvent(orgContext, {
              action: "ai.classify",
              entityType: "CitationCache",
              metadata: {
                batchSize: citations.length,
                classified: newlyClassified.length,
                streaming: true,
              },
            }).catch((err) =>
              console.warn("[/api/classify/stream] Audit event error:", err),
            );
          }
        }

        const provenance = buildAiProvenance({
          provider: "ithaca-classifier",
          model: "citation-classifier",
          promptVersion: CLASSIFIER_VERSION_SAFE,
          classifierVersion: 7,
          sourceIds: citations.flatMap((citation) => [
            citation.citingId,
            citation.citedId,
          ]),
          evidence:
            citations.flatMap((citation) => citation.citationContexts ?? [])
              .length > 0
              ? citations.flatMap((citation) => citation.citationContexts ?? [])
              : ["abstract-and-title"],
          confidence: stats.failed === 0 ? 1 : 0.5,
        });

        sendEvent("done", { stats, provenance });
      } catch (err) {
        console.error("[/api/classify/stream] Streaming error:", err);
        sendEvent("error", {
          message: err instanceof Error ? err.message : "Classification failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

const CLASSIFIER_VERSION_SAFE = CLASSIFIER_PROMPT_VERSION;
