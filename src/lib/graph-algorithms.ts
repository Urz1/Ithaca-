import Graph from "graphology";
import { debug } from "./debug";
import { COLORS } from "./constants";

export type PathMode = "shortest" | "conflict" | "consensus";

export interface SemanticPath {
  id: string;
  name: string;
  nodes: { id: string; title: string; year: number; authors: string }[];
  edges: {
    type: "supports" | "contradicts" | "extends" | "cites";
    confidence: number;
  }[];
  color: string;
  description: string;
}

/**
 * Finds a semantic path between two nodes based on the requested mode.
 *
 * @param graph The Sigma/Graphology graph instance
 * @param sourceId The starting node ID
 * @param targetId The destination node ID
 * @param mode The traversal mode
 */
export function findSemanticPath(
  graph: Graph,
  sourceId: string,
  targetId: string,
  mode: PathMode,
): SemanticPath[] {
  debug.graph(
    `[Pathfinder] Finding path from ${sourceId} to ${targetId} in mode: ${mode}`,
  );
  if (!graph.hasNode(sourceId) || !graph.hasNode(targetId)) {
    debug.warn("[Pathfinder] Source or Target node missing");
    return [];
  }

  // Dijkstra's Algorithm with edge weights based on mode
  type PreviousStep = { node: string; edge: string };

  const distances: Record<string, number> = {};
  const previous: Record<string, PreviousStep | undefined> = {};
  const queue: Set<string> = new Set(); // Simple priority queue simulation

  graph.forEachNode((node) => {
    distances[node] = Infinity;
    queue.add(node);
  });

  distances[sourceId] = 0;

  while (queue.size > 0) {
    // Find node with min distance in queue
    let u: string | null = null;
    let minDist = Infinity;

    for (const node of queue) {
      if (distances[node] < minDist) {
        minDist = distances[node];
        u = node;
      }
    }

    if (u === null || u === targetId) break; // Reached target or unreachable
    queue.delete(u);

    // Explore neighbors
    graph.forEachNeighbor(u, (v) => {
      if (!queue.has(v)) return;

      const edge = graph.edge(u, v) || graph.edge(v, u);
      if (!edge) return;

      const attrs = graph.getEdgeAttributes(edge);
      const type = attrs.edgeType || "cites";

      // Calculate weight based on mode
      let weight = 1; // Default

      if (mode === "conflict") {
        // Prioritize CONTRADICTS (low weight), penalize others
        weight = type === "contradicts" ? 1 : type === "cites" ? 10 : 20;
      } else if (mode === "consensus") {
        // Prioritize SUPPORTS/EXTENDS, penalize contradicts considerably
        weight = type === "contradicts" ? 50 : type === "cites" ? 5 : 1;
      }

      const alt = distances[u!] + weight;
      if (alt < distances[v]) {
        distances[v] = alt;
        previous[v] = { node: u!, edge };
      }
    });
  }

  // Reconstruct path
  if (distances[targetId] === Infinity) return []; // No path found

  const pathNodes: string[] = [];
  const pathEdges: string[] = [];
  let current: string | undefined = targetId;

  while (current && current !== sourceId) {
    pathNodes.unshift(current);
    const step: { node: string; edge: string } | undefined = previous[current];
    if (step) {
      pathEdges.unshift(step.edge);
      current = step.node;
    } else {
      break;
    }
  }
  pathNodes.unshift(sourceId);

  // Format output
  const formattedNodes = pathNodes.map((id) => {
    const attrs = graph.getNodeAttributes(id);
    return {
      id,
      title: attrs.title || attrs.label,
      year: attrs.year || 2024,
      authors: attrs.authors || "Unknown",
    };
  });

  const formattedEdges = pathEdges.map((edge) => {
    const attrs = graph.getEdgeAttributes(edge);
    return {
      type: attrs.edgeType,
      confidence: attrs.confidence,
    };
  });

  // Metadata based on mode
  let name = "Shortest Path";
  let color: string = COLORS.PATH.DEFAULT; // Blue
  let description = "The most direct connection found.";

  if (mode === "conflict") {
    const conflictCount = formattedEdges.filter(
      (e) => e.type === "contradicts",
    ).length;
    if (conflictCount > 0) {
      name = "Conflict Trail";
      color = COLORS.PATH.CONFLICT; // Red
      description = `Found a path with ${conflictCount} refutations.`;
    } else {
      name = "No Direct Conflict";
      color = COLORS.PATH.NO_CONFLICT; // Grey
      description =
        "No direct chain of refutations found (showing best alternative).";
    }
  } else if (mode === "consensus") {
    const conflictCount = formattedEdges.filter(
      (e) => e.type === "contradicts",
    ).length;
    if (conflictCount > 0) {
      name = "Best Available Path";
      color = COLORS.PATH.CONSENSUS; // Green
      description = `Best consensus path found — includes ${conflictCount} contradiction${conflictCount > 1 ? "s" : ""}.`;
    } else {
      name = "Consensus Lineage";
      color = COLORS.PATH.CONSENSUS; // Green
      description = "A path of supporting evidence and extensions.";
    }
  }

  return [
    {
      id: `path-${mode}-${Date.now()}`,
      name,
      nodes: formattedNodes,
      edges: formattedEdges,
      color,
      description,
    },
  ];
}
