import { NextRequest } from "next/server";
import { z } from "zod";
import {
  classifyBatch,
  type ClassificationInput,
} from "@/lib/api/citation-classifier";
import { withApiTelemetry } from "@/lib/api/api-telemetry";
import { getOptionalOrganizationContextFromRequest } from "@/lib/api/request-organization";
import {
  apiError,
  apiSuccess,
  createApiContext,
} from "@/lib/api/api-contracts";
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

  // Support both authenticated users and guest/dev exploration
  const authResult = await getOptionalApiAuth(request);
  const userId = authResult?.user.id ?? "guest-explorer";

  const rateLimited = await checkApiRateLimit(
    userId,
    "classify",
    30,
    context,
    orgContext?.organizationId,
  );
  if (rateLimited) return rateLimited;

  try {
    return await withApiTelemetry(
      context,
      {
        route: "/api/classify",
        userId,
        organizationId: orgContext?.organizationId,
      },
      async () => {
        const body = await request.json();
        const parsed = requestSchema.safeParse(body);
        if (!parsed.success) {
          throw new Error("Invalid request body");
        }

        const { citations } = parsed.data;
        for (const citation of citations) {
          const untrustedText = [
            citation.citingTitle,
            citation.citedTitle,
            citation.citingAbstract,
            citation.citedAbstract,
            ...(citation.citationContexts ?? []),
          ].join("\n");
          if (containsPromptInjectionRisk(untrustedText)) {
            throw new Error(
              "Unsupported instruction patterns in citation content",
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

        const results = await classifyBatch(
          citations as ClassificationInput[],
          3,
        );

        if (orgContext) {
          const classified = results.filter((result) => !result.cached);
          if (classified.length > 0) {
            await recordAiUsage({
              organizationId: orgContext.organizationId,
              userId: orgContext.userId,
              operation: "classify",
              provider: classified[0]?.provider ?? "unknown",
              model: "citation-classifier",
              inputText: JSON.stringify(citations),
              outputText: JSON.stringify(results),
            });
            await recordAuditEvent(orgContext, {
              action: "ai.classify",
              entityType: "CitationCache",
              metadata: {
                batchSize: citations.length,
                classified: classified.length,
              },
            });
          }
        }

        const stats = {
          total: results.length,
          cached: results.filter((result) => result.cached).length,
          classified: results.filter(
            (result) => !result.cached && result.provider !== "fallback",
          ).length,
          failed: results.filter((result) => result.provider === "fallback")
            .length,
        };

        const provenance = buildAiProvenance({
          provider: "ithaca-classifier",
          model: "citation-classifier",
          promptVersion: CLASSIFIER_PROMPT_VERSION,
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

        return apiSuccess({ results, stats, provenance }, context);
      },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid request body") {
      return apiError("INVALID_REQUEST", error.message, context);
    }
    if (
      error instanceof Error &&
      error.message.includes("Unsupported instruction patterns")
    ) {
      return apiError("INVALID_REQUEST", error.message, context);
    }
    if (error instanceof AuthorizationError) {
      return apiError("RATE_LIMIT_EXCEEDED", error.message, context);
    }
    console.error("[/api/classify] Error:", error);
    return apiError("INTERNAL_ERROR", "Classification failed", context);
  }
}
