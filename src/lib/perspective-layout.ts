import type Graph from "graphology";
import type { PaperLineageRole } from "@/lib/api/graph-api";

export interface PerspectiveLayoutOptions {
  width?: number;
  height?: number;
  anchorId?: string;
}

/**
 * Deterministic hash for stable spatial jitter without random drift.
 */
function hashCoord(id: string, salt = 0): number {
  let h = salt;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return (h % 200) - 100; // -100 to +100
}

/**
 * Tri-Hemispheric River Layout:
 * - West Hemisphere (X < -160): Upstream Foundational Roots (chronologically ordered)
 * - Center (X = 0, Y = 0): Anchor Paper (The Claim)
 * - East Hemisphere (X > +160): Downstream Debaters (stratified by stance: refutes on top, supports below, extends in center)
 */
export function applyHemisphericLayout(
  graph: Graph,
  options: PerspectiveLayoutOptions = {},
): { placed: number; upstreamCount: number; downstreamCount: number } {
  if (graph.order === 0) {
    return { placed: 0, upstreamCount: 0, downstreamCount: 0 };
  }

  // 1. Identify Anchor Node
  let anchorId = options.anchorId;
  if (!anchorId || !graph.hasNode(anchorId)) {
    // Find node with lineageRole === 'anchor' or largest node
    let maxSize = -1;
    graph.forEachNode((node, attrs) => {
      if (attrs.lineageRole === "anchor") {
        anchorId = node;
      } else if (!anchorId && (attrs.size || 0) > maxSize) {
        maxSize = attrs.size || 0;
        anchorId = node;
      }
    });
  }

  // 2. Partition nodes into Upstream, Downstream, and Anchor
  const upstreamNodes: string[] = [];
  const downstreamNodes: string[] = [];

  graph.forEachNode((node, attrs) => {
    // Save original force positions for layout toggle restoration
    if (attrs.forceX === undefined) {
      graph.setNodeAttribute(node, "forceX", attrs.x ?? 0);
      graph.setNodeAttribute(node, "forceY", attrs.y ?? 0);
    }

    if (node === anchorId || attrs.lineageRole === "anchor") {
      return;
    }

    const role = (attrs.lineageRole as PaperLineageRole) || "downstream";
    if (role === "upstream") {
      upstreamNodes.push(node);
    } else {
      downstreamNodes.push(node);
    }
  });

  // Position Anchor at Origin
  if (anchorId && graph.hasNode(anchorId)) {
    graph.setNodeAttribute(anchorId, "x", 0);
    graph.setNodeAttribute(anchorId, "y", 0);
  }

  // 3. Layout West Hemisphere (Foundational Roots)
  // Sort chronologically by publication year
  upstreamNodes.sort((a, b) => {
    const yA = Number(graph.getNodeAttribute(a, "year")) || 0;
    const yB = Number(graph.getNodeAttribute(b, "year")) || 0;
    return yA - yB;
  });

  const upCount = upstreamNodes.length;
  upstreamNodes.forEach((node, index) => {
    // Distribute along an arc on the west side
    const progress = upCount > 1 ? index / (upCount - 1) : 0.5;
    const angle = Math.PI * 0.65 + progress * (Math.PI * 0.7); // 117° to 243° (west facing arc)
    const radius = 260 + (index % 3) * 60;

    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * (radius * 0.75);

    graph.setNodeAttribute(node, "x", x);
    graph.setNodeAttribute(node, "y", y);
  });

  // 4. Layout East Hemisphere (The Battlefield)
  // Partition downstream into: contradicts, extends, supports, and neutral
  const refutingNodes: string[] = [];
  const extendingNodes: string[] = [];
  const supportingNodes: string[] = [];
  const neutralNodes: string[] = [];

  downstreamNodes.forEach((node) => {
    const attrs = graph.getNodeAttributes(node);
    const controversy = (attrs.controversyScore as number) || 0;
    const refutes = (attrs.refutes as number) || 0;
    const supports = (attrs.supports as number) || 0;

    // Check incoming/outgoing edges to anchor
    let isRefuting = refutes > 0 || controversy > 0;
    let isSupporting = supports > 0;
    let isExtending = false;

    if (anchorId && graph.hasNode(anchorId)) {
      if (graph.hasEdge(node, anchorId)) {
        const edgeAttrs = graph.getEdgeAttributes(node, anchorId);
        if (edgeAttrs.edgeType === "contradicts") isRefuting = true;
        if (edgeAttrs.edgeType === "supports") isSupporting = true;
        if (edgeAttrs.edgeType === "extends") isExtending = true;
      }
    }

    if (isRefuting) {
      refutingNodes.push(node);
    } else if (isSupporting) {
      supportingNodes.push(node);
    } else if (isExtending) {
      extendingNodes.push(node);
    } else {
      neutralNodes.push(node);
    }
  });

  // Place refuting nodes in the North-East quadrant (prominent upper right)
  placeStanceCluster(graph, refutingNodes, {
    baseAngle: -Math.PI * 0.25, // -45 degrees (top-right)
    angleSpan: Math.PI * 0.35,
    minRadius: 220,
    maxRadius: 380,
  });

  // Place extending nodes in the Mid-East sector (due right)
  placeStanceCluster(graph, extendingNodes, {
    baseAngle: 0, // 0 degrees (direct right)
    angleSpan: Math.PI * 0.25,
    minRadius: 260,
    maxRadius: 420,
  });

  // Place supporting nodes in the South-East quadrant (bottom-right)
  placeStanceCluster(graph, supportingNodes, {
    baseAngle: Math.PI * 0.25, // +45 degrees (bottom-right)
    angleSpan: Math.PI * 0.35,
    minRadius: 220,
    maxRadius: 380,
  });

  // Place neutral downstream nodes in a wider outer fan
  placeStanceCluster(graph, neutralNodes, {
    baseAngle: 0,
    angleSpan: Math.PI * 0.8,
    minRadius: 420,
    maxRadius: 520,
  });

  return {
    placed: graph.order,
    upstreamCount: upstreamNodes.length,
    downstreamCount: downstreamNodes.length,
  };
}

/**
 * Battlefield Layout:
 * Optimized strictly for the controversy crucible.
 * Anchor is at center.
 * Debaters are placed in high-contrast stance clusters with refutations facing front & top.
 */
export function applyBattlefieldLayout(
  graph: Graph,
  options: PerspectiveLayoutOptions = {},
): { placed: number } {
  if (graph.order === 0) return { placed: 0 };

  let anchorId = options.anchorId;
  if (!anchorId || !graph.hasNode(anchorId)) {
    graph.forEachNode((node, attrs) => {
      if (attrs.lineageRole === "anchor" || !anchorId) {
        anchorId = node;
      }
    });
  }

  if (anchorId && graph.hasNode(anchorId)) {
    graph.setNodeAttribute(anchorId, "x", 0);
    graph.setNodeAttribute(anchorId, "y", 0);
  }

  const activeNodes: string[] = [];
  graph.forEachNode((node, attrs) => {
    if (attrs.hidden) return;
    if (node === anchorId) return;

    if (attrs.forceX === undefined) {
      graph.setNodeAttribute(node, "forceX", attrs.x ?? 0);
      graph.setNodeAttribute(node, "forceY", attrs.y ?? 0);
    }
    activeNodes.push(node);
  });

  // Group by stance
  const refuting: string[] = [];
  const supporting: string[] = [];
  const extending: string[] = [];
  const others: string[] = [];

  activeNodes.forEach((node) => {
    let edgeType: string | undefined;
    if (anchorId && graph.hasEdge(node, anchorId)) {
      edgeType = graph.getEdgeAttribute(node, anchorId, "edgeType");
    }

    if (edgeType === "contradicts") {
      refuting.push(node);
    } else if (edgeType === "supports") {
      supporting.push(node);
    } else if (edgeType === "extends") {
      extending.push(node);
    } else {
      others.push(node);
    }
  });

  // Refutations: Top fan (180° to 0° upper half)
  placeStanceCluster(graph, refuting, {
    baseAngle: -Math.PI / 2, // -90° (top)
    angleSpan: Math.PI * 0.7,
    minRadius: 180,
    maxRadius: 300,
  });

  // Extensions: Left flank
  placeStanceCluster(graph, extending, {
    baseAngle: Math.PI * 0.9,
    angleSpan: Math.PI * 0.4,
    minRadius: 220,
    maxRadius: 340,
  });

  // Supports: Bottom & Right
  placeStanceCluster(graph, supporting, {
    baseAngle: Math.PI * 0.35,
    angleSpan: Math.PI * 0.6,
    minRadius: 190,
    maxRadius: 310,
  });

  // Others: Outer ring
  placeStanceCluster(graph, others, {
    baseAngle: 0,
    angleSpan: Math.PI * 2,
    minRadius: 360,
    maxRadius: 460,
  });

  return { placed: activeNodes.length + (anchorId ? 1 : 0) };
}

/**
 * Helper to position an array of nodes along an organic dialectic cluster.
 * Uses staggered multi-tier depth and organic offsets to prevent artificial bicycle-wheel rings.
 */
function placeStanceCluster(
  graph: Graph,
  nodes: string[],
  config: {
    baseAngle: number;
    angleSpan: number;
    minRadius: number;
    maxRadius: number;
  },
) {
  const count = nodes.length;
  if (count === 0) return;

  const startAngle = config.baseAngle - config.angleSpan / 2;
  const step = count > 1 ? config.angleSpan / (count - 1) : 0;

  nodes.forEach((node, i) => {
    // Natural jitter to angle to avoid robotic spoke alignment
    const angleJitter = (hashCoord(node, 7) / 100) * (step * 0.35);
    const angle =
      count === 1
        ? config.baseAngle
        : startAngle + i * step + angleJitter;

    // Organic 3-tier constellation depth
    const tier = i % 3;
    const radiusSpan = config.maxRadius - config.minRadius;
    const depthRatio = tier === 0 ? 0.15 : tier === 1 ? 0.65 : 0.95;
    const naturalRadiusJitter = (hashCoord(node, 19) / 100) * 25;
    const radius =
      config.minRadius + radiusSpan * depthRatio + naturalRadiusJitter;

    const jitterX = hashCoord(node, 11) * 0.4;
    const jitterY = hashCoord(node, 23) * 0.4;

    const x = Math.cos(angle) * radius + jitterX;
    const y = Math.sin(angle) * radius + jitterY;

    graph.setNodeAttribute(node, "x", x);
    graph.setNodeAttribute(node, "y", y);
  });
}
