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
import { findConflictPathFromPayload } from "@/lib/research-tools";
import { getGraphSnapshot } from "@/app/(app)/dashboard/actions";

const nodeSchema = z.object({
  id: z.string().min(1),
  title: z.string().optional(),
  year: z.number().optional(),
  authors: z.string().optional(),
});

const edgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  edgeType: z.string().optional(),
  confidence: z.number().optional(),
});

const schema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  graphId: z.string().optional(),
  nodes: z.array(nodeSchema).optional(),
  edges: z.array(edgeSchema).optional(),
});

/**
 * find_conflict_path — shortest conflict-biased path between two papers.
 * Accepts an inline graph payload or a frozen snapshot id.
 */
export async function POST(request: NextRequest) {
  const context = createApiContext(request);
  const authResult = await requireApiAuth(request, context);
  if (isRejection(authResult)) return authResult;

  const rateLimited = await checkApiRateLimit(
    authResult.user.id,
    "research-conflict-path",
    30,
    context,
  );
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "INVALID_REQUEST",
        "Invalid conflict-path request",
        context,
        {
          details: parsed.error.flatten(),
        },
      );
    }

    let nodes = parsed.data.nodes ?? [];
    let edges = parsed.data.edges ?? [];

    if (parsed.data.graphId) {
      const snapshot = await getGraphSnapshot(parsed.data.graphId);
      if (!snapshot?.snapshot) {
        return apiError("INVALID_REQUEST", "Graph snapshot not found", context);
      }
      nodes = snapshot.snapshot.nodes.map((node) => ({
        id: node.id,
        title: typeof node.title === "string" ? node.title : undefined,
        year: typeof node.year === "number" ? node.year : undefined,
        authors: typeof node.authors === "string" ? node.authors : undefined,
      }));
      edges = snapshot.snapshot.edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        edgeType: typeof edge.edgeType === "string" ? edge.edgeType : undefined,
        confidence:
          typeof edge.confidence === "number" ? edge.confidence : undefined,
      }));
    }

    if (nodes.length === 0 || edges.length === 0) {
      return apiError(
        "INVALID_REQUEST",
        "Provide nodes/edges or a graphId snapshot",
        context,
      );
    }

    const paths = findConflictPathFromPayload({
      sourceId: parsed.data.sourceId,
      targetId: parsed.data.targetId,
      nodes,
      edges,
    });

    return apiSuccess({ paths }, context);
  } catch (error) {
    console.error("[research/conflict-path]", error);
    return apiError("INTERNAL_ERROR", "Failed to find conflict path", context);
  }
}
