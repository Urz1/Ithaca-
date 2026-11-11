"use client";

import { useEffect, useState, useRef, useCallback, memo } from "react";
import { useLoadGraph, useSigma, useRegisterEvents } from "@react-sigma/core";
import { useTheme } from "next-themes";
import Graph from "graphology";
import * as graphApiModule from "@/lib/api/graph-api";
import type { PaperNode, EdgeData } from "@/lib/api/graph-api";
import { useCanvasStore } from "@/stores/canvas-store";
import { useEdgeFlowAnimation } from "@/hooks/useEdgeFlowAnimation";
import { useGraphSession } from "@/hooks/use-graph-session";
import { generateBibTeX } from "@/lib/formats/bibtex";
import { debug } from "@/lib/debug";
import { findSemanticPath } from "@/lib/graph-algorithms";
import {
  GRAPH,
  COLORS,
  CONTROVERSY,
  FILTERS,
  ANIMATION,
} from "@/lib/constants";
import type { CanvasInteractionApi } from "@/types/graph";
import type { FilterState } from "@/components/filters/global-filters";
import type {
  PaperData,
  EvidenceItem,
} from "@/components/inspector/paper-inspector";
import type { EdgeEvidence } from "@/components/canvas/edge-evidence-popover";
import { SIGNAL_SOURCE_LABELS } from "@/components/canvas/edge-evidence-popover";
import type { PathMode } from "@/lib/graph-algorithms";
import {
  clusterIntoSchoolsOfThought,
  buildMetanodeGraph,
  unpackSchoolInPlace,
  type SchoolOfThought,
  type MetaEdge,
} from "@/lib/graph-clustering";
import {
  applyHemisphericLayout,
  applyBattlefieldLayout,
} from "@/lib/perspective-layout";

// =============================================================================
// GRAPH LOADER COMPONENT
// =============================================================================

// Safely retrieve the API instance
const graphAPI = graphApiModule.graphAPI;

export interface GraphLoaderProps {
  onNodeClick: (paper: PaperData, evidence: EvidenceItem[]) => void;
  onNodeSelect?: (nodeId: string, label: string) => void;
  onEdgeClick?: (
    edgeId: string,
    position: { x: number; y: number },
    evidence: EdgeEvidence,
  ) => void;
  selectionMode?: boolean;
  focusNode?: string | null;
  focusModeNode?: string | null;
  onStatsChange: (stats: { nodeCount: number; edgeCount: number }) => void;
  onDataRangesChange?: (ranges: {
    minYear: number;
    maxYear: number;
    maxCitations: number;
  }) => void;
  onFilterStatsChange?: (stats: {
    hiddenNodes: number;
    hiddenEdges: number;
  }) => void;
  onRegisterInteractionApi?: (api: CanvasInteractionApi) => void;
  onRegisterExport?: (exportFn: () => Promise<string>) => void;
  onRegisterReset?: (resetFn: () => void) => void;
  onRegisterSigmaGraph?: (sigma: any, graph: Graph) => void;
  filters: FilterState;
  paperCount: number;
  refreshTrigger: number;
  relationshipFocus: "all" | "supports" | "contradicts" | "extends" | "cites";
  solidNodes: Set<string>;
  onAddToProject: (nodeId: string) => void;
  // Hoisted state for List View integration
  hoveredNode: string | null;
  onHoverNode: (nodeId: string | null) => void;
  onGraphLoaded?: (nodes: PaperData[]) => void;
  // Selection & path visualization
  selectedNodes?: string[];
  highlightedPath?: { nodeIds: Set<string>; edgeIds: Set<string> } | null;
}

/**
 * GraphLoader - Handles graph data loading, filtering, interactions, and state management.
 * Must be rendered inside a SigmaContainer to access Sigma context hooks.
 */
export const GraphLoader = memo(function GraphLoader({
  onNodeClick,
  onNodeSelect,
  onEdgeClick,
  selectionMode = false,
  focusNode,
  onStatsChange,
  onDataRangesChange,
  onFilterStatsChange,
  onRegisterInteractionApi,
  onRegisterExport,
  onRegisterReset,
  onRegisterSigmaGraph,
  filters,
  paperCount,
  refreshTrigger,
  relationshipFocus,
  focusModeNode,
  solidNodes,
  onAddToProject,
  hoveredNode,
  onHoverNode,
  onGraphLoaded,
  selectedNodes = [],
  highlightedPath = null,
}: GraphLoaderProps) {
  const loadGraph = useLoadGraph();
  const sigma = useSigma();
  const registerEvents = useRegisterEvents();
  const { resolvedTheme, theme } = useTheme();
  const isDark = (resolvedTheme || theme) === "dark";
  // hoveredNode state hoisted to parent
  const [hoveredEdges, setHoveredEdges] = useState<Set<string>>(new Set());
  const graphRef = useRef<Graph | null>(null);

  // Topology Intelligence & Perspective State
  const perspective = useCanvasStore((s) => s.perspective);
  const battlefieldMode = useCanvasStore((s) => s.battlefieldMode);
  const clusterViewMode = useCanvasStore((s) => s.clusterViewMode);
  const sovereignFilterActive = useCanvasStore((s) => s.sovereignFilterActive);
  const rawNodesRef = useRef<PaperNode[]>([]);
  const rawEdgesRef = useRef<EdgeData[]>([]);
  const schoolsRef = useRef<SchoolOfThought[]>([]);
  const metaEdgesRef = useRef<MetaEdge[]>([]);

  // Load graph data from API using live sigma Graphology instance
  const {
    saveGraph,
    loadGraph: loadSessionGraph,
    clearSession,
  } = useGraphSession(sigma.getGraph());

  // Track previous refresh trigger to detect manual refresh
  const prevRefreshRef = useRef(refreshTrigger);
  const relationshipFocusRef = useRef(relationshipFocus);
  relationshipFocusRef.current = relationshipFocus;

  // Sync dialectic distribution metrics to global store
  const syncDialecticCounts = useCallback((graph: Graph) => {
    let supports = 0;
    let contradicts = 0;
    let extendsCount = 0;
    let cites = 0;

    graph.forEachEdge((_e, attrs) => {
      if (attrs.hidden) return;
      const type = attrs.edgeType;
      if (type === "supports") supports++;
      else if (type === "contradicts") contradicts++;
      else if (type === "extends") extendsCount++;
      else cites++;
    });

    useCanvasStore.getState().setDialecticCounts({
      supports,
      contradicts,
      extends: extendsCount,
      cites,
    });
  }, []);

  // Ref to track and abort background streaming classification
  const hydrationAbortRef = useRef<AbortController | null>(null);

  // Progressive Stance Classification via SSE
  const startHydration = useCallback(
    (nodes: PaperNode[], edges: EdgeData[]) => {
      if (hydrationAbortRef.current) {
        hydrationAbortRef.current.abort();
      }

      const unclassified = edges.filter(
        (e) => e.edgeType === "cites" || e.signalSource === "default",
      );

      if (unclassified.length === 0) return;

      const controller = new AbortController();
      hydrationAbortRef.current = controller;

      useCanvasStore.getState().setHydrationState({
        isHydrating: true,
        totalEdges: unclassified.length,
        hydratedEdges: 0,
        cachedCount: 0,
      });

      graphAPI.streamClassify(nodes, unclassified, {
        signal: controller.signal,
        onChunk: (chunk) => {
          const graph = sigma.getGraph();
          let newlyHydrated = 0;

          chunk.forEach((edge) => {
            let edgeKey: string | null = null;
            if (graph.hasEdge(edge.id)) {
              edgeKey = edge.id;
            } else if (graph.hasEdge(edge.source, edge.target)) {
              edgeKey = graph.edge(edge.source, edge.target) ?? null;
            } else if (graph.hasEdge(`${edge.source}->${edge.target}`)) {
              edgeKey = `${edge.source}->${edge.target}`;
            }

            if (edgeKey && graph.hasEdge(edgeKey)) {
              graph.setEdgeAttribute(edgeKey, "edgeType", edge.edgeType);
              graph.setEdgeAttribute(edgeKey, "color", edge.color);
              graph.setEdgeAttribute(edgeKey, "originalColor", edge.color);
              graph.setEdgeAttribute(edgeKey, "confidence", edge.confidence);
              graph.setEdgeAttribute(edgeKey, "size", edge.size);
              graph.setEdgeAttribute(edgeKey, "originalSize", edge.size);
              if (edge.snippet)
                graph.setEdgeAttribute(edgeKey, "snippet", edge.snippet);
              if (edge.signalSource)
                graph.setEdgeAttribute(
                  edgeKey,
                  "signalSource",
                  edge.signalSource,
                );
              if (edge.contexts)
                graph.setEdgeAttribute(edgeKey, "contexts", edge.contexts);
              if (edge.provider)
                graph.setEdgeAttribute(edgeKey, "provider", edge.provider);

              // Update node controversy metrics live
              if (
                edge.edgeType === "contradicts" &&
                graph.hasNode(edge.target)
              ) {
                const currentScore =
                  (graph.getNodeAttribute(
                    edge.target,
                    "controversyScore",
                  ) as number) || 0;
                const newScore = currentScore + 1;
                graph.setNodeAttribute(
                  edge.target,
                  "controversyScore",
                  newScore,
                );
                if (newScore >= CONTROVERSY.THRESHOLD) {
                  graph.setNodeAttribute(edge.target, "highlighted", true);
                  graph.setNodeAttribute(
                    edge.target,
                    "color",
                    COLORS.CONTRADICTS,
                  );
                }
              }

              // Update target node dialectic stats live (supports & refutes)
              if (graph.hasNode(edge.target)) {
                let sCount = 0;
                let rCount = 0;
                graph.inEdges(edge.target).forEach((inEdgeKey) => {
                  const type = graph.getEdgeAttribute(inEdgeKey, "edgeType");
                  if (type === "supports") sCount++;
                  if (type === "contradicts") rCount++;
                });
                graph.setNodeAttribute(edge.target, "supports", sCount);
                graph.setNodeAttribute(edge.target, "refutes", rCount);

                // If currently viewed in PaperInspector, live-update store
                const currentSelected = useCanvasStore.getState().selectedPaper;
                if (
                  currentSelected &&
                  (currentSelected.id === edge.target ||
                    currentSelected.id ===
                      (graph.getNodeAttribute(edge.target, "paperId") as string))
                ) {
                  useCanvasStore.setState({
                    selectedPaper: {
                      ...currentSelected,
                      supports: sCount,
                      refutes: rCount,
                    },
                  });
                }
              }
            }
            newlyHydrated++;
          });

          sigma.refresh();
          syncDialecticCounts(graph);

          const prev = useCanvasStore.getState().hydrationState;
          useCanvasStore.getState().setHydrationState({
            hydratedEdges: Math.min(
              prev.totalEdges,
              prev.hydratedEdges + newlyHydrated,
            ),
          });
        },
        onDone: (stats) => {
          saveGraph();
          useCanvasStore.getState().setHydrationState({
            isHydrating: false,
            cachedCount: stats?.cached ?? 0,
          });
          setTimeout(() => {
            useCanvasStore.getState().resetHydrationState();
          }, 3500);
        },
        onError: (err) => {
          console.warn("[GraphLoader] Hydration stream error:", err);
          useCanvasStore.getState().setHydrationState({ isHydrating: false });
        },
      });
    },
    [sigma, syncDialecticCounts, saveGraph],
  );

  useEffect(() => {
    return () => {
      hydrationAbortRef.current?.abort();
      useCanvasStore.getState().resetHydrationState();
    };
  }, []);

  // Load graph data from API or Session
  useEffect(() => {
    const isManualRefresh = prevRefreshRef.current !== refreshTrigger;
    prevRefreshRef.current = refreshTrigger;

    async function loadGraphData() {
      // If user clicked Refresh or changed paper count, clear session first
      if (isManualRefresh) {
        clearSession();
        debug.graph("Session cleared for manual refresh");
      }

      // 1. Try loading from session (skipped on manual refresh)
      const sessionData = isManualRefresh ? null : loadSessionGraph();
      let nodes: PaperNode[] = [];
      let edges: EdgeData[] = [];
      let loadedFromSession = false;

      if (sessionData && sessionData.nodes.length > 0) {
        debug.graph("Restoring graph from session", sessionData.nodes.length);
        nodes = sessionData.nodes;
        edges = sessionData.edges;
        loadedFromSession = true;
      } else if (isManualRefresh && focusNode) {
        // Re-fetch using the active search/focus target with new paperCount
        const isTopic = focusNode.startsWith("topic-");
        if (isTopic) {
          const query = focusNode.replace("topic-", "");
          debug.graph(
            "Re-fetching topic slice:",
            query,
            "paperCount:",
            paperCount,
          );
          const data = await graphAPI.fetchTopicSlice(query, paperCount);
          nodes = data.nodes;
          edges = data.edges;
        } else {
          debug.graph(
            "Re-fetching paper context:",
            focusNode,
            "paperCount:",
            paperCount,
          );
          const data = await graphAPI.fetchPaperContext(focusNode, paperCount);
          nodes = data.nodes;
          edges = data.edges;
        }

        // Apply relationship focus filter on refresh
        const currentFocus = relationshipFocusRef.current;
        if (currentFocus !== "all") {
          edges = edges.filter((e: any) => e.edgeType === currentFocus);
          const connectedNodeIds = new Set<string>();
          for (const e of edges) {
            connectedNodeIds.add(e.source);
            connectedNodeIds.add(e.target);
          }
          if (!isTopic && focusNode) connectedNodeIds.add(focusNode);
          nodes = nodes.filter((n: any) => connectedNodeIds.has(n.id));
        }
      } else {
        // 2. Fetch from API (initial load — may return empty if no query yet)
        debug.graph("Fetching fresh graph data with paperCount:", paperCount);
        const data = await graphAPI.fetchGraph(paperCount);
        nodes = data.nodes;
        edges = data.edges;
      }

      // Notify parent of loaded nodes (for List View)
      if (onGraphLoaded) {
        onGraphLoaded(nodes);
      }

      const graph = new Graph({ multi: false, type: "directed" });

      // Calculate data ranges for dynamic filters
      let minYear = Infinity;
      let maxYear = -Infinity;
      let maxCitations = 0;

      nodes.forEach((node) => {
        if (node.year < minYear) minYear = node.year;
        if (node.year > maxYear) maxYear = node.year;
        if (node.citations > maxCitations) maxCitations = node.citations;
      });

      // Fallback values if no data
      if (minYear === Infinity) minYear = FILTERS.MIN_YEAR;
      if (maxYear === -Infinity) maxYear = FILTERS.MAX_YEAR;
      if (maxCitations === 0) maxCitations = FILTERS.DEFAULT_MAX_CITATIONS;

      // Report data ranges
      onDataRangesChange?.({
        minYear,
        maxYear,
        maxCitations,
      });

      // Calculate controversy metrics
      const controversyScores = new Map<string, number>();

      edges.forEach((edge) => {
        if (edge.edgeType === "contradicts") {
          const targetId =
            typeof edge.target === "string" ? edge.target : String(edge.target);
          const current = controversyScores.get(targetId) || 0;
          controversyScores.set(targetId, current + 1);
        }
      });

      // Add nodes
      nodes.forEach((node) => {
        const score = controversyScores.get(node.id) || 0;
        const isControversial = score >= CONTROVERSY.THRESHOLD;

        graph.addNode(node.id, {
          ...node,
          originalSize: node.size,
          hidden: false,
          controversyScore: score,
          highlighted: isControversial,
          zIndex: isControversial ? 10 : 1,
          color: isControversial
            ? "#f43f5e"
            : node.color || COLORS.CLUSTERS[node.cluster],
        });
      });

      // Add edges
      edges.forEach((edge) => {
        if (!graph.hasEdge(edge.id)) {
          const isContradiction = edge.edgeType === "contradicts";
          graph.mergeEdgeWithKey(edge.id, edge.source, edge.target, {
            ...edge,
            originalColor: isContradiction ? "#e11d48" : edge.color,
            originalSize: isContradiction
              ? 1.2
              : edge.size || GRAPH.DEFAULT_EDGE_SIZE,
            zIndex: isContradiction
              ? 10
              : edge.edgeType === "supports" || edge.edgeType === "extends"
                ? 5
                : 1,
            hidden: false,
          });
        }
      });

      rawNodesRef.current = nodes;
      rawEdgesRef.current = edges;

      // Compute Schools of Thought & MetaEdges
      const hierarchy = clusterIntoSchoolsOfThought(nodes, edges);
      schoolsRef.current = hierarchy.schools;
      metaEdgesRef.current = hierarchy.metaEdges;
      useCanvasStore.getState().setSchoolsOfThought(hierarchy.schools);

      if (clusterViewMode === "schools") {
        const metanodeGraph = buildMetanodeGraph(
          hierarchy.schools,
          hierarchy.metaEdges,
        );
        graphRef.current = metanodeGraph;
        loadGraph(metanodeGraph);

        if (onRegisterSigmaGraph) {
          onRegisterSigmaGraph(sigma, sigma.getGraph());
        }

        onStatsChange({
          nodeCount: metanodeGraph.order,
          edgeCount: metanodeGraph.size,
        });
        return;
      }

      // Apply initial perspective layout if fresh fetch
      if (!loadedFromSession) {
        const currentPerspective = useCanvasStore.getState().perspective;
        if (currentPerspective === "battlefield") {
          applyBattlefieldLayout(graph, { anchorId: focusNode || undefined });
        } else if (
          currentPerspective === "synthesis" ||
          currentPerspective === "foundations"
        ) {
          applyHemisphericLayout(graph, { anchorId: focusNode || undefined });
        }
      }

      graphRef.current = graph;
      loadGraph(graph);

      // Register sigma and its INTERNAL graph for export.
      // useLoadGraph().import() copies data into sigma's own graph instance,
      // so we must use sigma.getGraph() — that's where ForceAtlas2 writes
      // live layout positions (x, y).
      if (onRegisterSigmaGraph) {
        onRegisterSigmaGraph(sigma, sigma.getGraph());
      }

      // Report stats
      onStatsChange({
        nodeCount: graph.order,
        edgeCount: graph.size,
      });

      if (!loadedFromSession) {
        startHydration(nodes, edges);
      }
    }

    loadGraphData();
  }, [
    loadGraph,
    onStatsChange,
    onDataRangesChange,
    paperCount,
    refreshTrigger,
    focusNode,
    sigma,
    onRegisterSigmaGraph,
    startHydration,
  ]);

  // Switch between Paper Constellation and Schools of Thought
  const prevClusterModeRef = useRef(clusterViewMode);
  useEffect(() => {
    if (prevClusterModeRef.current === clusterViewMode) return;
    prevClusterModeRef.current = clusterViewMode;

    if (rawNodesRef.current.length === 0) return;

    if (clusterViewMode === "schools") {
      const hierarchy = clusterIntoSchoolsOfThought(
        rawNodesRef.current,
        rawEdgesRef.current,
      );
      schoolsRef.current = hierarchy.schools;
      metaEdgesRef.current = hierarchy.metaEdges;
      useCanvasStore.getState().setSchoolsOfThought(hierarchy.schools);

      const metanodeGraph = buildMetanodeGraph(
        hierarchy.schools,
        hierarchy.metaEdges,
      );
      graphRef.current = metanodeGraph;
      loadGraph(metanodeGraph);
      sigma.refresh();
      onStatsChange({
        nodeCount: metanodeGraph.order,
        edgeCount: metanodeGraph.size,
      });
    } else {
      // Re-populate with individual papers
      const graph = new Graph({ multi: false, type: "directed" });
      const controversyScores = new Map<string, number>();

      rawEdgesRef.current.forEach((edge) => {
        if (edge.edgeType === "contradicts") {
          const targetId = String(edge.target);
          controversyScores.set(
            targetId,
            (controversyScores.get(targetId) || 0) + 1,
          );
        }
      });

      rawNodesRef.current.forEach((node) => {
        const score = controversyScores.get(node.id) || 0;
        const isControversial = score >= CONTROVERSY.THRESHOLD;
        graph.addNode(node.id, {
          ...node,
          originalSize: node.size,
          hidden: false,
          controversyScore: score,
          highlighted: isControversial,
          zIndex: isControversial ? 10 : 1,
          color: isControversial
            ? "#f43f5e"
            : node.color || COLORS.CLUSTERS[node.cluster],
        });
      });

      rawEdgesRef.current.forEach((edge) => {
        if (!graph.hasEdge(edge.id)) {
          const isContradiction = edge.edgeType === "contradicts";
          graph.mergeEdgeWithKey(edge.id, edge.source, edge.target, {
            ...edge,
            originalColor: isContradiction ? "#e11d48" : edge.color,
            originalSize: isContradiction
              ? 1.2
              : edge.size || GRAPH.DEFAULT_EDGE_SIZE,
            zIndex: isContradiction
              ? 10
              : edge.edgeType === "supports" || edge.edgeType === "extends"
                ? 5
                : 1,
            hidden: false,
          });
        }
      });

      graphRef.current = graph;
      loadGraph(graph);
      sigma.refresh();
      onStatsChange({
        nodeCount: graph.order,
        edgeCount: graph.size,
      });
    }
  }, [clusterViewMode, loadGraph, onStatsChange, sigma]);

  // Apply filters when they change — coalesced via rAF to prevent jank
  const filterRafRef = useRef<number | null>(null);
  const latestFiltersRef = useRef(filters);
  latestFiltersRef.current = filters;

  useEffect(() => {
    // Cancel any pending frame to coalesce rapid changes
    if (filterRafRef.current !== null) {
      cancelAnimationFrame(filterRafRef.current);
    }

    filterRafRef.current = requestAnimationFrame(() => {
      filterRafRef.current = null;
      // Always use sigma's internal graph — graphRef.current is the external
      // copy that never receives FA2 positions or rendering updates.
      const graph = sigma.getGraph();
      if (!graph || graph.order === 0) return;

      const currentFilters = latestFiltersRef.current;
      const { hiddenNodes, hiddenEdges } = graphAPI.applyFilters(
        graph,
        currentFilters,
      );

      // If Focus Mode is active, override filtering logic
      let effectiveHiddenNodes = hiddenNodes;
      let effectiveHiddenEdges = hiddenEdges;

      if (focusModeNode && graph.hasNode(focusModeNode)) {
        const neighbors = graph.neighbors(focusModeNode);
        const visibleSet = new Set([focusModeNode, ...neighbors]);

        effectiveHiddenNodes = new Set();
        effectiveHiddenEdges = new Set();

        graph.forEachNode((node) => {
          if (!visibleSet.has(node)) {
            effectiveHiddenNodes.add(node);
          }
        });

        graph.forEachEdge((edge, _attrs, source, target) => {
          if (!visibleSet.has(source) || !visibleSet.has(target)) {
            effectiveHiddenEdges.add(edge);
          }
        });
      }

      // Perspective-driven zero-collision filtering
      if (perspective === "battlefield") {
        // Prune all upstream bibliography references (0% background noise)
        graph.forEachNode((node, attrs) => {
          if (attrs.lineageRole === "upstream") {
            effectiveHiddenNodes.add(node);
          }
        });
        graph.forEachEdge((edge, attrs) => {
          if (attrs.direction === "outbound") {
            effectiveHiddenEdges.add(edge);
          }
        });
      } else if (perspective === "foundations") {
        // Prune downstream debate works, showing only foundational ancestry
        graph.forEachNode((node, attrs) => {
          if (attrs.lineageRole === "downstream") {
            effectiveHiddenNodes.add(node);
          }
        });
        graph.forEachEdge((edge, attrs) => {
          if (attrs.direction === "inbound") {
            effectiveHiddenEdges.add(edge);
          }
        });
      }

      // Ensure all edges incident to hidden nodes are completely hidden
      graph.forEachEdge((edge, _attrs, source, target) => {
        if (
          effectiveHiddenNodes.has(source) ||
          effectiveHiddenNodes.has(target)
        ) {
          effectiveHiddenEdges.add(edge);
        }
      });

      // Build selection set for O(1) lookup
      const selectedSet = new Set(selectedNodes);
      const isPathActive = highlightedPath && highlightedPath.nodeIds.size > 0;

      // Batch node updates — use updateEachNodeAttributes to fire a single graphology event
      graph.updateEachNodeAttributes((node, attrs) => {
        const isHidden = effectiveHiddenNodes.has(node);

        if (isHidden) {
          return {
            ...attrs,
            hidden: true,
          };
        }

        // Metanodes retain their distinctive macro-bubble appearance
        if (attrs.isMetanode) {
          return {
            ...attrs,
            hidden: false,
          };
        }

        const isSolid = solidNodes?.has(node);
        const isGhost = !isSolid && attrs.status === "ghost";
        const isSelected = selectedSet.has(node);
        const isOnPath = isPathActive && highlightedPath!.nodeIds.has(node);

        const clusterPalette = isDark ? COLORS.CLUSTERS_DARK : COLORS.CLUSTERS_LIGHT;
        const edgeTokens = isDark ? COLORS.EDGES.DARK : COLORS.EDGES.LIGHT;

        // Selection ring colors: source = emerald, target = blue
        let color: string;
        if (isSelected && selectedNodes[0] === node) {
          color = "#10b981"; // emerald-500 (source)
        } else if (isSelected) {
          color = "#3b82f6"; // blue-500 (target)
        } else if (battlefieldMode) {
          // Battlefield High-Contrast Mode: Highlight disputes & confirmations
          const hasControversy = (attrs.controversyScore || 0) > 0;
          const hasSupports = (attrs.supports || 0) > 0;
          if (hasControversy) {
            color = edgeTokens.CONTRADICTS; // 🔴 Refined Rose
          } else if (hasSupports) {
            color = edgeTokens.SUPPORTS; // 🟢 Refined Emerald
          } else {
            // Non-contested node: clearly visible with gentle grounding (never invisible white)
            const raw =
              attrs.originalColor ||
              clusterPalette[attrs.cluster] ||
              (isDark ? "#94a3b8" : "#64748b");
            const hex = raw.startsWith("#") ? raw.slice(0, 7) : (isDark ? "#94a3b8" : "#64748b");
            color = isDark ? `${hex}88` : `${hex}a0`; // 53%-63% opacity, crisp & legible against canvas
          }
        } else if (sovereignFilterActive) {
          const isSovereign = Boolean(
            attrs.isSovereignIndex || attrs.institutionSlug,
          );
          if (isSovereign) {
            color = "#059669"; // Emerald green for sovereign papers
          } else {
            const raw =
              attrs.originalColor ||
              clusterPalette[attrs.cluster] ||
              (isDark ? "#94a3b8" : "#64748b");
            const hex = raw.startsWith("#") ? raw.slice(0, 7) : (isDark ? "#94a3b8" : "#64748b");
            color = `${hex}88`;
          }
        } else if (attrs.controversyScore > 0) {
          color = edgeTokens.CONTRADICTS;
        } else if (isGhost) {
          color = `${attrs.color}${COLORS.GHOST_ALPHA}`;
        } else {
          color =
            attrs.originalColor ||
            clusterPalette[attrs.cluster] ||
            clusterPalette[0];
        }

        // Dim nodes not on the active path (subtle, keep context visible)
        if (isPathActive && !isOnPath && !isSelected) {
          color = `${color}70`; // 44% opacity — light dim, not a blackout
        }

        const citations = typeof attrs.citations === "number" ? attrs.citations : 0;
        let citationBoost = 0;
        if (citations >= 1000) {
          citationBoost = 6;
        } else if (citations >= 200) {
          citationBoost = 3;
        } else if (citations >= 50) {
          citationBoost = 1.5;
        }

        const baseSize =
          (attrs.originalSize || attrs.size || GRAPH.DEFAULT_NODE_SIZE) + citationBoost;
        // Slightly enlarge selected nodes for emphasis
        let size = isSelected ? Math.max(baseSize * 1.3, 14) : baseSize;

        if (battlefieldMode && !isSelected) {
          const hasControversy = (attrs.controversyScore || 0) > 0;
          const hasSupports = (attrs.supports || 0) > 0;
          if (hasControversy) {
            size = Math.min(Math.max(baseSize * 1.1, 9), 11);
          } else if (hasSupports) {
            size = Math.min(Math.max(baseSize * 1.05, 8), 10);
          } else {
            size = Math.max(baseSize * 0.85, 6);
          }
        } else if (sovereignFilterActive && !isSelected) {
          const isSovereign = Boolean(
            attrs.isSovereignIndex || attrs.institutionSlug,
          );
          if (isSovereign) {
            size = Math.min(Math.max(baseSize * 1.15, 9), 12);
          } else {
            size = Math.max(baseSize * 0.8, 5);
          }
        }

        // Orphan nodes (topic search, no edges): smaller + semi-transparent
        const isOrphan = (attrs as any).isOrphan === true;
        if (isOrphan && !isSelected) {
          size = Math.max(baseSize * 0.6, 5);
          // Add transparency to the color if not already dimmed
          if (!isPathActive) {
            const baseColor = color.length === 7 ? color : color.slice(0, 7);
            color = `${baseColor}88`; // ~53% opacity
          }
        }

        return {
          ...attrs,
          hidden: false,
          color,
          size,
          ...(isSolid && attrs.status !== "solid" ? { status: "solid" } : {}),
        };
      });

      // Batch edge updates
      const edgeTokens = isDark ? COLORS.EDGES.DARK : COLORS.EDGES.LIGHT;
      graph.updateEachEdgeAttributes((_edge, attrs, source, target) => {
        const edgeKey = _edge;
        const isHidden = effectiveHiddenEdges.has(edgeKey);

        if (isHidden) {
          return {
            ...attrs,
            hidden: true,
            color: isDark ? "rgba(100, 100, 100, 0.05)" : "rgba(150, 150, 150, 0.05)",
            size: 0.1,
          };
        }

        const isOnPath = isPathActive && highlightedPath!.edgeIds.has(edgeKey);
        let edgeColor = attrs.originalColor || edgeTokens.CITES;
        let edgeSize = attrs.originalSize || (isDark ? 0.8 : 0.85);

        // Confidence-based opacity scaling:
        // High confidence (80-100%) → full opacity
        // Medium confidence (50-79%) → moderate transparency
        // Low confidence (<50%) → very transparent
        const confidence = (attrs as any).confidence as number | undefined;
        const edgeType = (attrs as any).edgeType as string | undefined;
        const isUnknown = edgeType === "unknown";
        const isCites = edgeType === "cites" || isUnknown;
        let renderedEdgeType: "line" | "arrow" = "line";

        if (battlefieldMode && !isPathActive) {
          if (edgeType === "contradicts") {
            edgeColor = edgeTokens.CONTRADICTS; // 🔴 refined rose
            edgeSize = 1.25;
            renderedEdgeType = "arrow";
          } else if (edgeType === "supports") {
            edgeColor = edgeTokens.SUPPORTS; // 🟢 refined emerald
            edgeSize = 1.15;
            renderedEdgeType = "arrow";
          } else if (edgeType === "extends") {
            edgeColor = edgeTokens.EXTENDS; // 🔵 refined sapphire
            edgeSize = 1.05;
            renderedEdgeType = "arrow";
          } else {
            // Neutral citations: crisp, visible slate filament (never invisible white or faint 0.1)
            edgeColor = isDark
              ? "rgba(148, 163, 184, 0.45)"
              : "rgba(100, 116, 139, 0.6)";
            edgeSize = 0.85;
            renderedEdgeType = "line";
          }
        } else if (sovereignFilterActive && !isPathActive) {
          const sourceAttrs = graph.hasNode(source)
            ? graph.getNodeAttributes(source)
            : {};
          const targetAttrs = graph.hasNode(target)
            ? graph.getNodeAttributes(target)
            : {};
          const isConnectedToSovereign = Boolean(
            sourceAttrs.isSovereignIndex ||
            sourceAttrs.institutionSlug ||
            targetAttrs.isSovereignIndex ||
            targetAttrs.institutionSlug,
          );
          if (isConnectedToSovereign) {
            edgeColor = "#059669"; // Highlight connections to sovereign Ethiopian literature
            edgeSize = 1.25;
          } else {
            edgeColor = isDark ? "rgba(160, 160, 160, 0.08)" : "rgba(100, 116, 139, 0.12)";
            edgeSize = 0.5;
          }
        } else if (!isPathActive) {
          if (edgeType === "contradicts") {
            edgeColor = edgeTokens.CONTRADICTS;
            edgeSize = 1.25;
          } else if (edgeType === "supports") {
            edgeColor = edgeTokens.SUPPORTS;
            edgeSize = 1.1;
          } else if (edgeType === "extends") {
            edgeColor = edgeTokens.EXTENDS;
            edgeSize = 1.0;
          } else if (isCites) {
            // "cites" edges: visible, crisp neutral slate line in light theme, luminous in dark
            edgeColor = isDark ? "rgba(100, 116, 139, 0.45)" : "rgba(100, 116, 139, 0.65)";
            edgeSize = 0.8;
          } else if (confidence != null && confidence < 80) {
            // Scale opacity: 0% confidence → 45% opacity, 80% → 100% opacity
            const opacity = 0.45 + (confidence / 80) * 0.55;
            const alpha = Math.round(opacity * 255)
              .toString(16)
              .padStart(2, "0");
            edgeColor = `${edgeColor.slice(0, 7)}${alpha}`;
            // Slightly thinner for low confidence
            if (confidence < 50) {
              edgeSize = 0.6;
            }
          }
        }

        if (isPathActive) {
          if (isOnPath) {
            // Thicken and brighten path edges
            edgeSize = Math.max(edgeSize * 2.5, 3);
          } else {
            // Dim non-path edges (subtle)
            edgeColor = `${edgeColor.slice(0, 7)}40`; // ~25% opacity
            edgeSize = 0.4;
          }
        }

        const edgeZIndex =
          edgeType === "contradicts"
            ? 10
            : edgeType === "supports" || edgeType === "extends"
              ? 5
              : 1;

        return {
          ...attrs,
          hidden: false,
          color: edgeColor,
          size: edgeSize,
          type: renderedEdgeType,
          zIndex: edgeZIndex,
        };
      });

      // Report filtering stats
      if (onFilterStatsChange) {
        onFilterStatsChange({
          hiddenNodes: effectiveHiddenNodes.size,
          hiddenEdges: effectiveHiddenEdges.size,
        });
      }

      // Update visible papers list to match filter state in real-time
      if (onGraphLoaded) {
        const visible: PaperData[] = [];
        graph.forEachNode((node, attrs) => {
          if (attrs.hidden) return;
          visible.push({
            id: attrs.paperId || node,
            title: attrs.title || attrs.label || "Untitled",
            authors: attrs.authors || "Unknown",
            year: attrs.year || 2024,
            venue: attrs.venue,
            arxivId: attrs.arxivId,
            doi: attrs.doi,
            openAccessUrl: attrs.openAccessUrl,
            citations: attrs.citations || 0,
            references: attrs.references,
            supports: graph.edges(node).filter((e) => {
              const ea = graph.getEdgeAttributes(e);
              return ea.edgeType === "supports" && graph.target(e) === node;
            }).length,
            refutes: graph.edges(node).filter((e) => {
              const ea = graph.getEdgeAttributes(e);
              return ea.edgeType === "contradicts" && graph.target(e) === node;
            }).length,
            abstract: attrs.abstract,
            status: attrs.status,
            lineageRole: attrs.lineageRole,
          });
        });
        onGraphLoaded(visible);
      }

      // Single refresh after all batch updates
      sigma.refresh();
    });

    return () => {
      if (filterRafRef.current !== null) {
        cancelAnimationFrame(filterRafRef.current);
      }
    };
  }, [
    filters,
    sigma,
    onFilterStatsChange,
    onGraphLoaded,
    refreshTrigger,
    focusModeNode,
    solidNodes,
    selectedNodes,
    highlightedPath,
    battlefieldMode,
    perspective,
    sovereignFilterActive,
    isDark,
  ]);

  // Switch perspective layout when user toggles perspective
  const prevPerspectiveRef = useRef(perspective);
  useEffect(() => {
    if (prevPerspectiveRef.current === perspective) return;
    prevPerspectiveRef.current = perspective;

    const graph = sigma.getGraph();
    if (!graph || graph.order === 0) return;

    if (perspective === "battlefield") {
      applyBattlefieldLayout(graph, { anchorId: focusNode || undefined });
    } else if (perspective === "synthesis" || perspective === "foundations") {
      applyHemisphericLayout(graph, { anchorId: focusNode || undefined });
    }
    sigma.refresh();
  }, [perspective, sigma, focusNode]);

  // Register Interaction API
  useEffect(() => {
    if (!onRegisterInteractionApi) return;

    const api: CanvasInteractionApi = {
      focusNodes: (nodeIds: string[]) => {
        const graph = sigma.getGraph();
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;

        let foundNode = false;

        nodeIds.forEach((nodeId: string) => {
          // Use display data for safer visual coordinates
          const data = sigma.getNodeDisplayData(nodeId);
          if (!data) return;

          const x = data.x || 0;
          const y = data.y || 0;

          if (typeof x !== "number" || typeof y !== "number") return;

          foundNode = true;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        });

        if (!foundNode || minX === Infinity) return;

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;

        // Sanity check
        if (isNaN(cx) || isNaN(cy)) return;

        sigma
          .getCamera()
          .animate(
            { x: cx, y: cy, ratio: GRAPH.CAMERA_ZOOM_RATIO, angle: 0 },
            { duration: ANIMATION.CAMERA_DURATION_SLOW },
          );
      },

      exportSelection: (
        nodeIds: string[],
        format: "csv" | "bibtex" = "csv",
      ) => {
        const graph = sigma.getGraph();
        const data = nodeIds
          .map((id: string) => {
            if (!graph.hasNode(id)) return null;
            const attrs = graph.getNodeAttributes(id);
            return {
              id: attrs.paperId || attrs.id || id,
              title: attrs.title || "Untitled",
              authors: attrs.authors || "Unknown",
              year: attrs.year || "",
              citations: attrs.citations || 0,
              venue: attrs.venue,
              ...attrs, // Pass all attrs for BibTeX
            };
          })
          .filter(Boolean);

        if (data.length === 0) {
          debug.warn(
            "Export failed: No valid nodes found in selection",
            nodeIds,
          );
          return;
        }

        let content = "";
        let mimeType = "text/csv;charset=utf-8;";
        let extension = "csv";

        if (format === "bibtex") {
          // @ts-ignore - generateBibTeX expects PaperNode but we passed mapped data.
          // We should ensure mapped data matches PaperNode roughly or cast.
          // Since PaperNode interface is from graph-api, and we are reconstructing it.
          // Let's import generateBibTeX at top of file first.
          // Using dynamic import or assuming import exists.
          // I'll add the import in a separate replacement or assume I can add it here if I replace the logic appropriately.
          // I will implement simple logic here or use the helper.
          // Better to use the helper.

          // I need to add import to top of file.
          // For this replacement, I'll assume helper is imported.

          content = generateBibTeX(data as any[]);
          mimeType = "application/x-bibtex;charset=utf-8;";
          extension = "bib";
        } else {
          // CSV
          content =
            "ID,Title,Authors,Year,Citations\n" +
            data
              .map(
                (row: any) =>
                  `"${row?.id}","${row?.title}","${row?.authors}",${row?.year},${row?.citations}`,
              )
              .join("\n");
        }

        const encodedUri = encodeURI(`data:${mimeType},${content}`);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute(
          "download",
          `selection_export_${new Date().getTime()}.${extension}`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },

      findPaths: (
        sourceId: string,
        targetId: string,
        mode: PathMode = "shortest",
      ) => {
        return findSemanticPath(sigma.getGraph(), sourceId, targetId, mode);
      },

      clearHighlights: () => {
        // Clear any highlighted paths or nodes
        const graph = sigma.getGraph();
        graph.forEachNode((node, attrs) => {
          if (attrs.originalColor) {
            graph.setNodeAttribute(node, "color", attrs.originalColor);
          }
        });
        sigma.refresh();
      },

      expandNode: async (
        nodeId: string,
        direction: "in" | "out",
        type?: "all" | "supports" | "contradicts" | "extends",
      ) => {
        const graph = sigma.getGraph();
        if (!graph.hasNode(nodeId)) return;

        try {
          const { nodes: newNodes, edges: newEdges } =
            await graphAPI.expandNode(nodeId, direction, type);

          let addedCount = 0;

          // Merge nodes
          newNodes.forEach((node) => {
            if (!graph.hasNode(node.id)) {
              graph.addNode(node.id, {
                ...node,
                originalSize: node.size,
                hidden: false,
                // Start small for animation
                size: 0,
                x: node.x, // graphAPI provides initial position near parent
                y: node.y,
              });

              // Animate size up
              // We can't easily animate individual props in sigma via API, but we can set them
              // and let the loop handle it or just set them directly
              graph.setNodeAttribute(node.id, "size", node.size);
              addedCount++;
            }
          });

          // Merge edges
          newEdges.forEach((edge) => {
            if (!graph.hasEdge(edge.id)) {
              graph.mergeEdgeWithKey(edge.id, edge.source, edge.target, {
                ...edge,
                originalColor: edge.color,
                originalSize: edge.size || GRAPH.DEFAULT_EDGE_SIZE,
                hidden: false,
              });
            }
          });

          if (addedCount > 0) {
            onStatsChange({
              nodeCount: graph.order,
              edgeCount: graph.size,
            });
            // Trigger re-layout if we had one?
            // Ideally we just place them near and let the user decide, or run a small layout burst
            // forcing a refresh
            sigma.refresh();
          }
        } catch (e) {
          debug.error("Expansion failed", e);
        }
      },

      expandByTopic: async (nodeId: string) => {
        const graph = sigma.getGraph();
        if (!graph.hasNode(nodeId)) return;

        try {
          const { nodes: newNodes } = await graphAPI.expandByTopic(nodeId);

          // Position new nodes near the source paper
          const sourceAttrs = graph.getNodeAttributes(nodeId);
          const sx = sourceAttrs.x || 0;
          const sy = sourceAttrs.y || 0;

          let addedCount = 0;
          newNodes.forEach((node, i) => {
            if (!graph.hasNode(node.id)) {
              const angle = (Math.PI * 2 * i) / Math.max(newNodes.length, 1);
              const radius = 80 + Math.random() * 40;
              graph.addNode(node.id, {
                ...node,
                originalSize: node.size,
                hidden: false,
                size: node.size,
                x: sx + Math.cos(angle) * radius,
                y: sy + Math.sin(angle) * radius,
              });
              addedCount++;
            }
          });

          if (addedCount > 0) {
            onStatsChange({
              nodeCount: graph.order,
              edgeCount: graph.size,
            });
            sigma.refresh();
          }
        } catch (e) {
          debug.error("Topic expansion failed", e);
        }
      },
      addGraphData: (nodes: PaperNode[], edges: EdgeData[], clear = false) => {
        const graph = sigma.getGraph();
        if (clear) {
          graph.clear();
          rawNodesRef.current = [];
          rawEdgesRef.current = [];
        }

        let addedCount = 0;

        // Keep raw data refs in sync so filter ranges, schools unpack, and search bounds stay accurate
        nodes.forEach((node: PaperNode) => {
          if (!rawNodesRef.current.some((n) => n.id === node.id)) {
            rawNodesRef.current.push(node);
          }
        });
        edges.forEach((edge: EdgeData) => {
          if (!rawEdgesRef.current.some((e) => e.id === edge.id)) {
            rawEdgesRef.current.push(edge);
          }
        });

        // Dynamically recompute data ranges
        if (rawNodesRef.current.length > 0) {
          const years = rawNodesRef.current
            .map((n) => n.year)
            .filter((y): y is number => typeof y === "number");
          const citations = rawNodesRef.current.map((n) => n.citations || 0);
          onDataRangesChange?.({
            minYear: years.length ? Math.min(...years) : 1900,
            maxYear: years.length ? Math.max(...years) : 2026,
            maxCitations: citations.length ? Math.max(...citations) : 1000,
          });
        }

        nodes.forEach((node: PaperNode) => {
          if (!graph.hasNode(node.id)) {
            graph.addNode(node.id, {
              ...node,
              originalSize: node.size || GRAPH.DEFAULT_NODE_SIZE,
              hidden: false,
              // If focusing on a new slice, maybe force position if provided, else use layout
              x: node.x || Math.random() * 100,
              y: node.y || Math.random() * 100,
              size: node.size || GRAPH.DEFAULT_NODE_SIZE,
              color: node.color,
            });
            addedCount++;
          }
        });

        edges.forEach((edge: EdgeData) => {
          if (
            !graph.hasEdge(edge.id) &&
            graph.hasNode(edge.source) &&
            graph.hasNode(edge.target)
          ) {
            graph.mergeEdgeWithKey(edge.id, edge.source, edge.target, {
              ...edge,
              hidden: false,
              size: edge.size || GRAPH.DEFAULT_EDGE_SIZE,
              originalSize: edge.size || GRAPH.DEFAULT_EDGE_SIZE,
              originalColor: edge.color,
              color: edge.color,
            });
          }
        });

        if (addedCount > 0 || clear) {
          onStatsChange({
            nodeCount: graph.order,
            edgeCount: graph.size,
          });
          syncDialecticCounts(graph);
          saveGraph();
          sigma.refresh();

          // If clearing, reset camera potentially?
          if (clear) {
            // simple layout/zoom
            // sigma.getCamera().animatedReset();
          }

          // Trigger progressive hydration for added graph elements
          startHydration(nodes, edges);
        }
      },
    };

    onRegisterInteractionApi(api);
  }, [
    sigma,
    onRegisterInteractionApi,
    onStatsChange,
    onDataRangesChange,
    syncDialecticCounts,
    saveGraph,
    startHydration,
  ]);

  // Set up event handlers
  useEffect(() => {
    registerEvents({
      enterNode: (event) => onHoverNode(event.node),
      leaveNode: () => onHoverNode(null),
      doubleClickNode: (event) => {
        const graph = sigma.getGraph();
        if (!graph.hasNode(event.node)) return;
        const attrs = graph.getNodeAttributes(event.node);

        if (attrs.isMetanode && rawNodesRef.current.length > 0) {
          unpackSchoolInPlace(
            graph,
            event.node,
            rawNodesRef.current,
            rawEdgesRef.current,
            schoolsRef.current,
          );
          useCanvasStore.getState().toggleSchoolExpansion(event.node);
          useCanvasStore
            .getState()
            .showToastMessage(
              `Unpacked "${attrs.label}" (${attrs.paperCount} papers deployed).`,
            );
          sigma.refresh();
          onStatsChange({ nodeCount: graph.order, edgeCount: graph.size });
        }
      },
      clickNode: async (event) => {
        const attrs = sigma.getGraph().getNodeAttributes(event.node);

        // If clicking a metanode bubble in Schools view
        if (attrs.isMetanode) {
          useCanvasStore
            .getState()
            .showToastMessage(
              `🏫 ${attrs.label} • Double-click to unpack ${attrs.paperCount} member papers in-place.`,
            );
          return;
        }

        // If in selection mode, add node to selection
        if (selectionMode && onNodeSelect) {
          onNodeSelect(event.node, attrs.title || attrs.label || event.node);
          return;
        }

        const graph = sigma.getGraph();

        const getDialecticWeight = (edgeType?: string) => {
          if (edgeType === "contradicts") return 3;
          if (edgeType === "supports") return 2;
          if (edgeType === "extends") return 1;
          return 0;
        };

        const incomingEdges = graph
          .edges(event.node)
          .filter((edge) => graph.target(edge) === event.node)
          .sort((a, b) => {
            const aAttrs = graph.getEdgeAttributes(a) as {
              edgeType?: string;
              confidence?: number;
            };
            const bAttrs = graph.getEdgeAttributes(b) as {
              edgeType?: string;
              confidence?: number;
            };
            const weightDiff =
              getDialecticWeight(bAttrs.edgeType) -
              getDialecticWeight(aAttrs.edgeType);
            if (weightDiff !== 0) return weightDiff;
            return (bAttrs.confidence ?? 0) - (aAttrs.confidence ?? 0);
          });

        const evidence: EvidenceItem[] = incomingEdges
          .slice(0, 25)
          .map((edge) => {
            const edgeAttrs = graph.getEdgeAttributes(edge) as {
              edgeType?:
                "supports" | "contradicts" | "extends" | "cites" | "unknown";
              confidence?: number;
              snippet?: string;
              signalSource?: string;
              contexts?: string[];
              provider?: string;
            };
            const sourceId = graph.source(edge);
            const sourceAttrs = graph.getNodeAttributes(sourceId) as PaperNode;

            const relation =
              edgeAttrs.edgeType === "contradicts"
                ? "refutes"
                : edgeAttrs.edgeType === "supports"
                  ? "supports"
                  : edgeAttrs.edgeType === "cites"
                    ? "cites"
                    : edgeAttrs.edgeType === "unknown"
                      ? "cites" // Map legacy "unknown" to "cites"
                      : "extends";

            return {
              id: `ev-${edge}`,
              sourcePaper: {
                id: sourceId,
                title: sourceAttrs.title || sourceAttrs.label,
                authors: sourceAttrs.authors || "Unknown Authors",
                year: sourceAttrs.year || 2024,
              },
              relation,
              confidence:
                (edgeAttrs.confidence ?? 50) <= 1
                  ? Math.round((edgeAttrs.confidence ?? 50) * 100)
                  : Math.round(edgeAttrs.confidence ?? 50),
              snippet:
                edgeAttrs.snippet || "Citation relationship evaluated by AI.",
              source: edgeAttrs.provider,
              signalSource:
                edgeAttrs.signalSource as EvidenceItem["signalSource"],
              citationSentences: edgeAttrs.contexts,
            };
          });

        const supportsCount = incomingEdges.filter((edge) => {
          const edgeAttrs = graph.getEdgeAttributes(edge) as {
            edgeType?: "supports" | "contradicts" | "extends";
          };
          return edgeAttrs.edgeType === "supports";
        }).length;

        const refutesCount = incomingEdges.filter((edge) => {
          const edgeAttrs = graph.getEdgeAttributes(edge) as {
            edgeType?: "supports" | "contradicts" | "extends";
          };
          return edgeAttrs.edgeType === "contradicts";
        }).length;

        // Get real paper data from the graph
        const paperData: PaperData = {
          id: attrs.paperId || `#${event.node}`,
          title: attrs.title || attrs.label,
          authors: attrs.authors || "Unknown Authors",
          year: attrs.year || 2024,
          venue: attrs.venue,
          arxivId: attrs.arxivId,
          doi: attrs.doi,
          openAccessUrl: attrs.openAccessUrl,
          citations: attrs.citations || 0,
          references: attrs.references || 0,
          supports: supportsCount,
          refutes: refutesCount,
          abstract: attrs.abstract,
          aiSummary: attrs.aiSummary,
          status: attrs.status,
          originalPublicationYear: attrs.originalPublicationYear,
          isReissue: attrs.isReissue,
        };

        onNodeClick(paperData, evidence);
      },
      clickEdge: (event) => {
        if (!onEdgeClick) return;

        const graph = sigma.getGraph();
        const attrs = graph.getEdgeAttributes(event.edge);
        const sourceAttrs = graph.getNodeAttributes(graph.source(event.edge));
        const targetAttrs = graph.getNodeAttributes(graph.target(event.edge));

        const type = (attrs.edgeType || "cites") as
          "supports" | "contradicts" | "extends" | "cites" | "unknown";

        // Use real snippet from the classifier (stored as edge attribute)
        // Only fall back to template if no real snippet exists
        const realSnippet = attrs.snippet as string | undefined;
        const signalSource = (attrs.signalSource || "default") as string;
        const contexts = attrs.contexts as string[] | undefined;

        // Build evidence snippets: prefer real S2 citation contexts, then LLM snippet
        const snippets: EdgeEvidence["snippets"] = [];

        // Add S2 citation context sentences first (highest value)
        if (contexts && contexts.length > 0) {
          for (const ctx of contexts) {
            snippets.push({
              text: ctx,
              source: "Semantic Scholar — extracted from paper full text",
              context: "Discussion" as const,
            });
          }
        }

        // Add the LLM/heuristic snippet as the classifier's interpretation
        if (realSnippet) {
          snippets.push({
            text: realSnippet,
            source:
              SIGNAL_SOURCE_LABELS[signalSource]?.label || "AI classification",
          });
        }

        // If nothing available at all, show a transparent message
        if (snippets.length === 0) {
          snippets.push({
            text: "No evidence data available for this citation relationship.",
            source: "Classification data unavailable",
          });
        }

        const evidence: EdgeEvidence = {
          id: event.edge,
          edgeType: type,
          confidence: attrs.confidence || 20,
          sourcePaper: {
            id: graph.source(event.edge),
            title: sourceAttrs.title || sourceAttrs.label || "Source Paper",
            authors: sourceAttrs.authors || "Unknown",
            year: sourceAttrs.year || 2024,
            openAccessUrl: sourceAttrs.openAccessUrl as string | undefined,
          },
          targetPaper: {
            id: graph.target(event.edge),
            title: targetAttrs.title || targetAttrs.label || "Target Paper",
            authors: targetAttrs.authors || "Unknown",
            year: targetAttrs.year || 2024,
            openAccessUrl: targetAttrs.openAccessUrl as string | undefined,
          },
          snippets,
          signalSource: signalSource as EdgeEvidence["signalSource"],
        };

        // Get payload position (screen coordinates)
        // @ts-ignore - position exists in event payload
        const { x, y } = event.event.original;

        onEdgeClick(event.edge, { x, y }, evidence);
      },
    });
  }, [
    registerEvents,
    sigma,
    onNodeClick,
    onNodeSelect,
    onEdgeClick,
    selectionMode,
  ]);

  // Register Export Function
  useEffect(() => {
    if (!onRegisterExport) return;

    const exportGraph = async (): Promise<string> => {
      // Get all Sigma canvases
      const canvases = sigma.getCanvases() as unknown as Record<
        string,
        HTMLCanvasElement
      >;
      const canvasList = Object.values(canvases);

      if (canvasList.length === 0) return "";

      // Create a composite canvas
      const width = canvasList[0].width;
      const height = canvasList[0].height;

      const composite = document.createElement("canvas");
      composite.width = width;
      composite.height = height;
      const ctx = composite.getContext("2d");

      if (!ctx) return "";

      // Fill background (dark mode detection handled by checking theme if passed, or default to current canvas style)
      // Since we don't know theme here easily without prop, we'll assume transparent or match canvas container color
      // But let's check global theme
      const isDark = document.documentElement.classList.contains("dark");
      ctx.fillStyle = isDark ? "#0B0C10" : "#F6F7F8";
      ctx.fillRect(0, 0, width, height);

      // Draw layers in order (scene, edges, nodes, labels usually)
      // Sigma v3 canvases are typically: scene, mouse, other layers
      // We'll just draw all we find
      canvasList.forEach((canvas) => {
        ctx.drawImage(canvas, 0, 0);
      });

      return composite.toDataURL("image/png");
    };

    onRegisterExport(exportGraph);
  }, [sigma, onRegisterExport]);

  // Register Reset Function
  useEffect(() => {
    if (!onRegisterReset) return;

    const resetView = () => {
      sigma.getCamera().animatedReset({ duration: 600 });
    };

    onRegisterReset(resetView);
  }, [sigma, onRegisterReset]);

  // Apply focus to specific node
  useEffect(() => {
    if (!focusNode) return;

    const graph = sigma.getGraph();
    if (!graph.hasNode(focusNode)) {
      debug.warn(`Node ${focusNode} not found`);
      return;
    }

    const nodePosition = sigma.getNodeDisplayData(focusNode);
    if (nodePosition) {
      sigma.getCamera().animate(
        {
          x: nodePosition.x,
          y: nodePosition.y,
          ratio: GRAPH.FOCUS_ZOOM_RATIO,
          angle: 0,
        },
        { duration: ANIMATION.CAMERA_DURATION },
      );
    }
  }, [focusNode, sigma]);

  // Apply hover effects — only highlight edges, never touch node sizes
  useEffect(() => {
    const graph = sigma.getGraph();
    if (!graph || graph.order === 0) return;

    // Track which edges are connected to hovered node for flow animation
    const connectedEdges = new Set<string>();

    // Only set zIndex on the hovered node (no size changes at all)
    if (hoveredNode && graph.hasNode(hoveredNode)) {
      graph.setNodeAttribute(hoveredNode, "zIndex", GRAPH.HIGHLIGHT_Z_INDEX);
    }

    graph.forEachEdge((edge, attrs, source, target) => {
      if (attrs.hidden) return;

      const baseEdgeSize = attrs.originalSize || GRAPH.DEFAULT_EDGE_SIZE;

      if (hoveredNode) {
        if (source === hoveredNode || target === hoveredNode) {
          connectedEdges.add(edge);
          graph.setEdgeAttribute(
            edge,
            "size",
            baseEdgeSize * GRAPH.HOVER_EDGE_SIZE_MULTIPLIER,
          );
          graph.setEdgeAttribute(edge, "zIndex", GRAPH.HIGHLIGHT_Z_INDEX);
        } else {
          graph.setEdgeAttribute(edge, "size", GRAPH.UNHOVER_EDGE_SIZE);
          graph.setEdgeAttribute(edge, "zIndex", 0);
        }
      } else {
        graph.setEdgeAttribute(edge, "size", baseEdgeSize);
        graph.setEdgeAttribute(edge, "zIndex", 0);
      }
    });

    // Reset zIndex when nothing is hovered
    if (!hoveredNode) {
      graph.forEachNode((node) => {
        graph.setNodeAttribute(node, "zIndex", 0);
      });
    }

    setHoveredEdges(connectedEdges);
    sigma.refresh();
  }, [hoveredNode, sigma]);

  // Enable flowing animation on hovered edges
  useEdgeFlowAnimation({
    enabled: true,
    hoveredEdges,
  });

  return null;
});
