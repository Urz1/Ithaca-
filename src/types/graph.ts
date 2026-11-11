/**
 * Graph Types
 *
 * Centralized type definitions for the graph visualization system.
 * Re-exports from graph-api.ts and adds additional UI-specific types.
 */

// Re-export API types
export type {
  PaperNode,
  PaperLineageRole,
  EdgeData,
  EvidenceItem,
  GraphStats,
  SearchResult,
} from "@/lib/api/graph-api";

// =============================================================================
// IMPORTS
// =============================================================================

import type { PaperNode, EdgeData, EvidenceItem } from "@/lib/api/graph-api";
import type { FilterState } from "@/components/filters/global-filters";
import type { PathMode } from "@/lib/graph-algorithms";
import type Graph from "graphology";

// =============================================================================
// GRAPH DATA TYPES
// =============================================================================

/** Response from graph fetch operations */
export interface GraphFetchResult {
  nodes: PaperNode[];
  edges: EdgeData[];
}

/** Response from cluster search operations */
export interface ClusterSearchResult extends GraphFetchResult {
  clusters: ClusterInfo[];
}

/** Cluster information */
export interface ClusterInfo {
  id: number;
  label: string;
  color: string;
  nodeCount: number;
}

// =============================================================================
// GRAPH API SHAPE
// =============================================================================

/** Shape of the graph API service - matches GraphAPIService class */
export interface GraphApiShape {
  fetchGraph: (paperCount: number) => Promise<GraphFetchResult>;
  fetchTopicSlice: (
    query: string,
    paperCount?: number,
  ) => Promise<ClusterSearchResult>;
  fetchPaperContext: (
    paperId: string,
    paperCount?: number,
  ) => Promise<GraphFetchResult>;
  getPaperById: (id: string) => Promise<PaperNode | null>;
  getEvidence: (paperId: string) => Promise<EvidenceItem[]>;
  searchPapers: (
    query: string,
  ) => Promise<
    { id: string; title: string; authors: string; year: number; type: string }[]
  >;
  expandNode: (
    nodeId: string,
    direction?: "in" | "out" | "both",
    type?: "supports" | "contradicts" | "extends" | "all",
  ) => Promise<GraphFetchResult>;
  applyFilters: (
    graph: Graph,
    filters: FilterState,
  ) => { hiddenNodes: Set<string>; hiddenEdges: Set<string> };
}

// =============================================================================
// INTERACTION API
// =============================================================================

/** Graph interaction API exposed to parent components */
export interface GraphInteractionApi {
  focusNodes: (nodeIds: string[]) => void;
  exportSelection: (nodeIds: string[], format?: "csv" | "bibtex") => void;
  findPaths: (sourceId: string, targetId: string, mode?: PathMode) => unknown[];
  clearHighlights: () => void;
}

/** Extended interaction API with internal canvas methods */
export interface CanvasInteractionApi extends GraphInteractionApi {
  expandNode: (
    nodeId: string,
    direction: "in" | "out",
    type?: "all" | "supports" | "contradicts" | "extends",
  ) => Promise<void>;
  expandByTopic: (nodeId: string) => Promise<void>;
  addGraphData: (
    nodes: PaperNode[],
    edges: EdgeData[],
    clear?: boolean,
  ) => void;
}

// =============================================================================
// CANVAS STATE
// =============================================================================

/** Tooltip state for node hover */
export interface TooltipState {
  nodeId: string;
  x: number;
  y: number;
}

/** Edge popover state */
export interface EdgePopoverState {
  edgeId: string;
  x: number;
  y: number;
}

/** Node attributes as stored in Graphology */
export interface NodeAttributes extends Omit<PaperNode, "id"> {
  originalColor?: string;
  originalSize?: number;
}

/** Edge attributes as stored in Graphology */
export interface EdgeAttributes extends Omit<
  EdgeData,
  "id" | "source" | "target"
> {
  originalColor?: string;
  originalSize?: number;
}

// =============================================================================
// EVENT PAYLOADS
// =============================================================================

/** Sigma event payload for mouse events */
export interface SigmaMouseEventPayload {
  node?: string;
  edge?: string;
  event: MouseEvent;
}

/** Sigma event payload with position */
export interface SigmaPositionEventPayload extends SigmaMouseEventPayload {
  position: {
    x: number;
    y: number;
  };
}
