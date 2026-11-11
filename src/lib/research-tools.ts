import Graph from "graphology";
import { findSemanticPath, type SemanticPath } from "@/lib/graph-algorithms";
import { prisma } from "@/lib/prisma";

export interface StanceSummary {
  paperId: string;
  supports: number;
  contradicts: number;
  extends: number;
  cites: number;
  unknown: number;
  samples: Array<{
    neighborId: string;
    edgeType: string;
    confidence: number;
    snippet?: string | null;
    direction: "citing" | "cited";
  }>;
}

export async function getStanceForPaper(
  paperId: string,
): Promise<StanceSummary> {
  const rows = await prisma.citationCache.findMany({
    where: {
      OR: [{ citingId: paperId }, { citedId: paperId }],
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const summary: StanceSummary = {
    paperId,
    supports: 0,
    contradicts: 0,
    extends: 0,
    cites: 0,
    unknown: 0,
    samples: [],
  };

  for (const row of rows) {
    const type = row.edgeType as keyof Omit<
      StanceSummary,
      "paperId" | "samples"
    >;
    if (type in summary && typeof summary[type] === "number") {
      summary[type] += 1;
    } else {
      summary.unknown += 1;
    }

    if (summary.samples.length < 12) {
      summary.samples.push({
        neighborId: row.citingId === paperId ? row.citedId : row.citingId,
        edgeType: row.edgeType,
        confidence: row.confidence,
        snippet: row.snippet,
        direction: row.citingId === paperId ? "citing" : "cited",
      });
    }
  }

  return summary;
}

export function buildGraphFromPayload(input: {
  nodes: Array<{ id: string; title?: string; year?: number; authors?: string }>;
  edges: Array<{
    source: string;
    target: string;
    edgeType?: string;
    confidence?: number;
  }>;
}): Graph {
  const graph = new Graph({ multi: false, type: "directed" });
  for (const node of input.nodes) {
    if (!graph.hasNode(node.id)) {
      graph.addNode(node.id, {
        title: node.title || node.id,
        year: node.year || 0,
        authors: node.authors || "Unknown",
      });
    }
  }
  for (const edge of input.edges) {
    if (!graph.hasNode(edge.source) || !graph.hasNode(edge.target)) continue;
    if (graph.hasEdge(edge.source, edge.target)) continue;
    graph.addEdge(edge.source, edge.target, {
      edgeType: edge.edgeType || "cites",
      confidence: edge.confidence ?? 50,
    });
  }
  return graph;
}

export function findConflictPathFromPayload(input: {
  sourceId: string;
  targetId: string;
  nodes: Array<{ id: string; title?: string; year?: number; authors?: string }>;
  edges: Array<{
    source: string;
    target: string;
    edgeType?: string;
    confidence?: number;
  }>;
}): SemanticPath[] {
  const graph = buildGraphFromPayload(input);
  return findSemanticPath(graph, input.sourceId, input.targetId, "conflict");
}
