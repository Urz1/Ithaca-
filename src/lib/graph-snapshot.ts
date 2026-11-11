import type Graph from "graphology";

export const GRAPH_SNAPSHOT_KIND = "ithaca-graph-snapshot" as const;
export const GRAPH_SNAPSHOT_VERSION = 1 as const;

export interface GraphSnapshotNode {
  id: string;
  [key: string]: unknown;
}

export interface GraphSnapshotEdge {
  id: string;
  source: string;
  target: string;
  [key: string]: unknown;
}

export interface GraphSnapshotPayload {
  kind: typeof GRAPH_SNAPSHOT_KIND;
  version: typeof GRAPH_SNAPSHOT_VERSION;
  query?: string;
  nodes: GraphSnapshotNode[];
  edges: GraphSnapshotEdge[];
  capturedAt: string;
}

const DROP_NODE_KEYS = new Set(["hidden", "highlighted", "selected"]);

export function isGraphSnapshotPayload(
  value: unknown,
): value is GraphSnapshotPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Partial<GraphSnapshotPayload>;
  return (
    candidate.kind === GRAPH_SNAPSHOT_KIND &&
    candidate.version === GRAPH_SNAPSHOT_VERSION &&
    Array.isArray(candidate.nodes) &&
    Array.isArray(candidate.edges)
  );
}

export function serializeGraphSnapshot(
  graph: Graph,
  query?: string,
): GraphSnapshotPayload {
  const nodes: GraphSnapshotNode[] = [];
  const edges: GraphSnapshotEdge[] = [];

  graph.forEachNode((node, attributes) => {
    if (attributes.hidden) return;
    const cleaned: GraphSnapshotNode = { id: node };
    for (const [key, value] of Object.entries(attributes)) {
      if (DROP_NODE_KEYS.has(key)) continue;
      cleaned[key] = value;
    }
    nodes.push(cleaned);
  });

  graph.forEachEdge((edge, attributes, source, target) => {
    if (attributes.hidden) return;
    edges.push({
      id: edge,
      source,
      target,
      ...attributes,
    });
  });

  return {
    kind: GRAPH_SNAPSHOT_KIND,
    version: GRAPH_SNAPSHOT_VERSION,
    query,
    nodes,
    edges,
    capturedAt: new Date().toISOString(),
  };
}

const QUESTION_PREFIX =
  /^(how|why|what|does|do|is|are|can|should|will|which|when|where)\b/i;

/** Detect research questions that should seed a debate-biased topic map. */
export function isResearchQuestion(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  if (trimmed.endsWith("?")) return true;
  return QUESTION_PREFIX.test(trimmed) && trimmed.split(/\s+/).length >= 4;
}

/**
 * Resolve a free-text entry into a paper ID, DOI, question-*, or topic-* target.
 */
export function resolveExploreEntryTarget(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;

  const openAlexMatch = trimmed.match(/(?:https?:\/\/openalex\.org\/)?(W\d+)/i);
  if (openAlexMatch) return openAlexMatch[1];

  const doiFromUrl = trimmed.match(/doi\.org\/(10\.\d{4,9}\/[^\s?#]+)/i);
  if (doiFromUrl) return doiFromUrl[1].replace(/\/$/, "");

  const doiMatch = trimmed.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9]+/i);
  if (doiMatch) return doiMatch[0].replace(/\/$/, "");

  if (trimmed.startsWith("topic-") || trimmed.startsWith("question-")) {
    return trimmed;
  }

  if (isResearchQuestion(trimmed)) {
    return `question-${trimmed.replace(/\?+$/, "").trim()}`;
  }

  return `topic-${trimmed}`;
}
