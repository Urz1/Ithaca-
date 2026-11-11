/**
 * Topology Intelligence & Graph Clustering Engine
 *
 * Implements community detection, semantic clustering, and metanode graph construction
 * for high-level "Schools of Thought" navigation and anti-hairball visualization.
 */

import Graph from "graphology";
import type { PaperNode, EdgeData } from "@/lib/api/graph-api";
import { COLORS } from "@/lib/constants";

// =============================================================================
// TYPES
// =============================================================================

export interface SchoolOfThought {
  id: string;
  label: string;
  color: string;
  papers: PaperNode[];
  paperCount: number;
  disputeCount: number;
  supportsCount: number;
  centroid: { x: number; y: number };
  isExpanded: boolean;
}

export interface MetaEdge {
  id: string;
  sourceSchool: string;
  targetSchool: string;
  weight: number;
  contradictionsCount: number;
  supportsCount: number;
  color: string;
  edgeType: "supports" | "contradicts" | "extends" | "cites";
}

export interface ClusterHierarchyResult {
  schools: SchoolOfThought[];
  metaEdges: MetaEdge[];
  nodeToSchool: Map<string, string>;
}

// 6 distinct, accessible theme colors for schools
export const SCHOOL_PALETTE = [
  "#6366f1", // Indigo
  "#0ea5e9", // Sky Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Rose
  "#8b5cf6", // Violet
];

// Stop words to ignore during cluster label generation
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
  "using",
  "towards",
  "via",
  "based",
  "new",
  "study",
  "approach",
  "analysis",
  "model",
  "models",
  "paper",
  "learning",
  "deep",
  "neural",
  "network",
  "system",
  "systems",
  "effect",
  "effects",
  "impact",
  "role",
  "review",
  "methods",
  "case",
  "evaluation",
  "framework",
  "performance",
  "evidence",
  "results",
  "empirical",
  "investigation",
  "implications",
  "comparative",
  "perspectives",
  "overview",
  "application",
  "applications",
]);

/**
 * Extracts a distinctive, concise title for a cluster of papers based on frequent keywords.
 */
export function extractClusterLabel(
  papers: PaperNode[],
  fallbackIndex: number,
): string {
  if (papers.length === 0) {
    return `School ${fallbackIndex + 1}`;
  }

  // Count word frequencies across all titles
  const wordCounts = new Map<string, number>();

  for (const paper of papers) {
    const title = paper.title || paper.label || "";
    // Normalize and tokenize words
    const words = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !STOP_WORDS.has(w));

    for (const word of words) {
      wordCounts.set(word, (wordCounts.get(word) || 0) + 1);
    }
  }

  // Sort by frequency
  const sortedWords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);

  if (sortedWords.length >= 2) {
    const w1 = capitalize(sortedWords[0]);
    const w2 = capitalize(sortedWords[1]);
    return `${w1} & ${w2}`;
  }

  if (sortedWords.length === 1) {
    return `${capitalize(sortedWords[0])} Research`;
  }

  // Fallback to first author or short title
  const first = papers[0];
  if (first.title) {
    const shortTitle = first.title.split(/[:\-\?]/)[0].trim();
    if (shortTitle.length > 0 && shortTitle.length <= 28) {
      return shortTitle;
    }
  }

  return `School ${fallbackIndex + 1}`;
}

function capitalize(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Calculates a clean centroid position for a school of thought.
 * If papers have existing (x,y) positions with non-zero variance, use their average.
 * Otherwise, arrange schools symmetrically in a circular macro-layout.
 */
export function calculateCentroid(
  papers: PaperNode[],
  schoolIndex: number,
  totalSchools: number,
  radius = 280,
): { x: number; y: number } {
  const positioned = papers.filter((p) => p.x !== 0 || p.y !== 0);

  if (positioned.length > 0) {
    const sumX = positioned.reduce((acc, p) => acc + p.x, 0);
    const sumY = positioned.reduce((acc, p) => acc + p.y, 0);
    const avgX = sumX / positioned.length;
    const avgY = sumY / positioned.length;

    // Check if positions are diverse enough (not all collapsed on single point)
    const variance = positioned.reduce(
      (acc, p) => acc + Math.hypot(p.x - avgX, p.y - avgY),
      0,
    );
    if (variance > 10) {
      return { x: Math.round(avgX), y: Math.round(avgY) };
    }
  }

  // Circular layout around center
  const angle =
    (2 * Math.PI * schoolIndex) / Math.max(totalSchools, 1) - Math.PI / 2;
  return {
    x: Math.round(radius * Math.cos(angle)),
    y: Math.round(radius * Math.sin(angle)),
  };
}

/**
 * Clusters papers and citations into 3–6 semantic "Schools of Thought".
 *
 * Uses a hybrid approach:
 * 1. Checks node `cluster` attribute (from topic or OpenAlex classification)
 * 2. Uses citation graph connectivity (Adjacency / Connected Components)
 * 3. Partitions dense subgraphs into 3–6 balanced metanodes
 * 4. Aggregates inter-school citation bridges and controversy counts
 */
export function clusterIntoSchoolsOfThought(
  nodes: PaperNode[],
  edges: EdgeData[],
  maxSchools = 5,
): ClusterHierarchyResult {
  if (nodes.length === 0) {
    return {
      schools: [],
      metaEdges: [],
      nodeToSchool: new Map(),
    };
  }

  // Target number of schools: between 3 and min(6, maxSchools, nodes.length)
  const targetSchoolCount = Math.max(
    1,
    Math.min(
      maxSchools,
      6,
      Math.max(
        nodes.length <= 3 ? nodes.length : 3,
        Math.ceil(nodes.length / 8),
      ),
    ),
  );

  // Group papers by existing cluster property or fallback to community partitioning
  const clusterBuckets = new Map<number, PaperNode[]>();

  nodes.forEach((node) => {
    const rawCluster = typeof node.cluster === "number" ? node.cluster : 0;
    const bucket = clusterBuckets.get(rawCluster) || [];
    bucket.push(node);
    clusterBuckets.set(rawCluster, bucket);
  });

  // Convert buckets to ordered groups
  let groups: PaperNode[][] = Array.from(clusterBuckets.values()).sort(
    (a, b) => b.length - a.length,
  );

  // If there's only 1 cluster bucket but multiple nodes, partition by connectivity
  if (groups.length === 1 && nodes.length > 3) {
    groups = partitionByAdjacency(nodes, edges, targetSchoolCount);
  }

  // Merge or split to fit targetSchoolCount (between 2 and 6)
  if (groups.length > targetSchoolCount) {
    // Keep top (targetSchoolCount - 1) largest, merge remainder into last bucket
    const top = groups.slice(0, targetSchoolCount - 1);
    const remainder = groups.slice(targetSchoolCount - 1).flat();
    groups = [...top, remainder];
  } else if (groups.length < 3 && nodes.length >= 6) {
    // Split largest group if too few clusters
    while (groups.length < targetSchoolCount && groups[0].length >= 4) {
      const largest = groups.shift()!;
      const mid = Math.ceil(largest.length / 2);
      groups.push(largest.slice(0, mid));
      groups.push(largest.slice(mid));
      groups.sort((a, b) => b.length - a.length);
    }
  }

  // Map each paper to its school ID
  const nodeToSchool = new Map<string, string>();
  const schools: SchoolOfThought[] = [];

  groups.forEach((paperList, idx) => {
    const schoolId = `school-${idx}`;
    const color = SCHOOL_PALETTE[idx % SCHOOL_PALETTE.length];
    const label = extractClusterLabel(paperList, idx);
    const centroid = calculateCentroid(paperList, idx, groups.length);

    paperList.forEach((paper) => {
      nodeToSchool.set(paper.id, schoolId);
      nodeToSchool.set(paper.paperId, schoolId);
    });

    schools.push({
      id: schoolId,
      label,
      color,
      papers: paperList,
      paperCount: paperList.length,
      disputeCount: 0,
      supportsCount: 0,
      centroid,
      isExpanded: false,
    });
  });

  // Build MetaEdges and count controversies
  const metaEdgeMap = new Map<string, MetaEdge>();

  edges.forEach((edge) => {
    const srcId = String(edge.source);
    const tgtId = String(edge.target);
    const srcSchool = nodeToSchool.get(srcId);
    const tgtSchool = nodeToSchool.get(tgtId);

    const isContradiction = edge.edgeType === "contradicts";
    const isSupport = edge.edgeType === "supports";

    // Tally disputes & supports within schools
    if (srcSchool) {
      const s = schools.find((sc) => sc.id === srcSchool);
      if (s) {
        if (isContradiction) s.disputeCount++;
        if (isSupport) s.supportsCount++;
      }
    }
    if (tgtSchool && tgtSchool !== srcSchool) {
      const t = schools.find((sc) => sc.id === tgtSchool);
      if (t) {
        if (isContradiction) t.disputeCount++;
        if (isSupport) t.supportsCount++;
      }
    }

    // Inter-school citation bridge
    if (srcSchool && tgtSchool && srcSchool !== tgtSchool) {
      const key = `${srcSchool}->${tgtSchool}`;
      let meta = metaEdgeMap.get(key);

      if (!meta) {
        meta = {
          id: `meta-${key}`,
          sourceSchool: srcSchool,
          targetSchool: tgtSchool,
          weight: 0,
          contradictionsCount: 0,
          supportsCount: 0,
          color: "#9ca3af",
          edgeType: "cites",
        };
        metaEdgeMap.set(key, meta);
      }

      meta.weight += 1;
      if (isContradiction) meta.contradictionsCount += 1;
      if (isSupport) meta.supportsCount += 1;

      // Prioritize contradiction color > support > cites
      if (meta.contradictionsCount > 0) {
        meta.edgeType = "contradicts";
        meta.color = COLORS.CONTRADICTS;
      } else if (meta.supportsCount > 0) {
        meta.edgeType = "supports";
        meta.color = COLORS.SUPPORTS;
      } else {
        meta.edgeType = "cites";
        meta.color = "#9ca3af";
      }
    }
  });

  return {
    schools,
    metaEdges: Array.from(metaEdgeMap.values()),
    nodeToSchool,
  };
}

/**
 * Fallback partitioning algorithm using connected components & breadth-first traversal
 * when explicit cluster tags are absent.
 */
function partitionByAdjacency(
  nodes: PaperNode[],
  edges: EdgeData[],
  targetBuckets: number,
): PaperNode[][] {
  const adj = new Map<string, Set<string>>();
  nodes.forEach((n) => adj.set(n.id, new Set()));

  edges.forEach((e) => {
    const s = String(e.source);
    const t = String(e.target);
    if (adj.has(s) && adj.has(t)) {
      adj.get(s)!.add(t);
      adj.get(t)!.add(s);
    }
  });

  const visited = new Set<string>();
  const buckets: PaperNode[][] = [];
  const nodeMap = new Map<string, PaperNode>(nodes.map((n) => [n.id, n]));

  // Find components
  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const component: PaperNode[] = [];
    const queue: string[] = [node.id];
    visited.add(node.id);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const p = nodeMap.get(current);
      if (p) component.push(p);

      const neighbors = adj.get(current) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    buckets.push(component);
  }

  // Distribute papers if fewer than targetBuckets
  if (buckets.length === 1 && nodes.length >= targetBuckets) {
    const single = buckets[0];
    const chunkSize = Math.ceil(single.length / targetBuckets);
    const result: PaperNode[][] = [];
    for (let i = 0; i < single.length; i += chunkSize) {
      result.push(single.slice(i, i + chunkSize));
    }
    return result;
  }

  return buckets;
}

/**
 * Builds a Graphology instance representing the high-level Metanode Graph
 * where nodes are Schools of Thought and edges are aggregate dispute/citation bridges.
 */
export function buildMetanodeGraph(
  schools: SchoolOfThought[],
  metaEdges: MetaEdge[],
): Graph {
  const graph = new Graph({ multi: false, type: "directed" });

  schools.forEach((school) => {
    const disputeTag =
      school.disputeCount > 0 ? ` • ⚔️ ${school.disputeCount}` : "";
    const displayLabel = `${school.label} (${school.paperCount}p${disputeTag})`;

    // Scale metanode size by paper volume
    const baseSize = Math.max(
      24,
      Math.min(56, 20 + Math.sqrt(school.paperCount) * 7),
    );

    graph.addNode(school.id, {
      id: school.id,
      label: displayLabel,
      color: school.color,
      x: school.centroid.x,
      y: school.centroid.y,
      size: baseSize,
      originalSize: baseSize,
      isMetanode: true,
      schoolId: school.id,
      paperCount: school.paperCount,
      disputeCount: school.disputeCount,
      supportsCount: school.supportsCount,
      papers: school.papers,
      isExpanded: school.isExpanded,
      hidden: false,
    });
  });

  metaEdges.forEach((meta) => {
    if (graph.hasNode(meta.sourceSchool) && graph.hasNode(meta.targetSchool)) {
      const edgeSize = Math.min(
        6,
        Math.max(1.5, 1.2 + Math.log2(meta.weight + 1)),
      );
      graph.addEdgeWithKey(meta.id, meta.sourceSchool, meta.targetSchool, {
        id: meta.id,
        weight: meta.weight,
        edgeType: meta.edgeType,
        color: meta.color,
        originalColor: meta.color,
        size: edgeSize,
        originalSize: edgeSize,
        contradictionsCount: meta.contradictionsCount,
        supportsCount: meta.supportsCount,
        hidden: false,
      });
    }
  });

  return graph;
}

/**
 * Unpacks a School of Thought in place, removing its macro-bubble and deploying
 * its constituent papers in a clean radial constellation around the school's centroid.
 */
export function unpackSchoolInPlace(
  graph: Graph,
  schoolId: string,
  allNodes: PaperNode[],
  allEdges: EdgeData[],
  schools: SchoolOfThought[],
): void {
  const school = schools.find((s) => s.id === schoolId);
  if (!school) return;

  // Mark school as expanded
  school.isExpanded = true;

  const centroid = school.centroid;
  const papers = school.papers;
  const count = papers.length;

  // Remove the metanode from the graph if present
  if (graph.hasNode(schoolId)) {
    graph.dropNode(schoolId);
  }

  // Radius for unpacked member papers
  const radius = Math.max(65, 26 * Math.sqrt(count));

  // Add individual paper nodes
  papers.forEach((paper, i) => {
    if (!graph.hasNode(paper.id)) {
      const angle = (2 * Math.PI * i) / Math.max(count, 1);
      const px = Math.round(centroid.x + radius * Math.cos(angle));
      const py = Math.round(centroid.y + radius * Math.sin(angle));

      graph.addNode(paper.id, {
        ...paper,
        x: px,
        y: py,
        color: school.color,
        originalColor: school.color,
        isMemberOfSchool: schoolId,
        hidden: false,
      });
    }
  });

  // Re-link internal edges between papers of this school
  allEdges.forEach((edge) => {
    const sId = String(edge.source);
    const tId = String(edge.target);

    // If both source & target are present in this school (or already in graph)
    if (graph.hasNode(sId) && graph.hasNode(tId)) {
      if (!graph.hasEdge(edge.id)) {
        graph.mergeEdgeWithKey(edge.id, sId, tId, {
          ...edge,
          originalColor: edge.color,
          originalSize: edge.size || 1,
          hidden: false,
        });
      }
    }
  });
}
