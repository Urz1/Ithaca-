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
import { getStanceForPaper } from "@/lib/research-tools";

const schema = z.object({
  paperId: z.string().min(1),
});

/**
 * get_stance — summarize support/contradict/extend relationships for a paper.
 * MCP-ready JSON API.
 */
export async function POST(request: NextRequest) {
  const context = createApiContext(request);
  const authResult = await requireApiAuth(request, context);
  if (isRejection(authResult)) return authResult;

  const rateLimited = await checkApiRateLimit(
    authResult.user.id,
    "research-stance",
    60,
    context,
  );
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError("INVALID_REQUEST", "paperId is required", context, {
        details: parsed.error.flatten(),
      });
    }

    const stance = await getStanceForPaper(parsed.data.paperId);
    return apiSuccess({ stance }, context);
  } catch (error) {
    console.error("[research/stance]", error);
    return apiError("INTERNAL_ERROR", "Failed to compute stance", context);
  }
}
