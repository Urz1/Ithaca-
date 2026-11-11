"use client";

import { useCallback } from "react";
import { useCanvasActions, useCanvasRefs } from "@/contexts/canvas-context";
import { useCanvasStore } from "@/stores/canvas-store";
import { findSemanticPath } from "@/lib/graph-algorithms";
import type { SemanticPath, PathMode } from "@/lib/graph-algorithms";
import { debug } from "@/lib/debug";

/**
 * Hook for node selection (max 2: Source → Target), path comparison, and export.
 */
export function useCanvasSelection() {
  const actions = useCanvasActions();
  const refs = useCanvasRefs();
  const selectedNodes = useCanvasStore((s) => s.selectedNodes);
  const nodeLabels = useCanvasStore((s) => s.nodeLabels);
  const calculatedPaths = useCanvasStore((s) => s.calculatedPaths);

  /**
   * Select a node as Source (slot 0) or Target (slot 1).
   * - If already selected, deselect it.
   * - If 2 are already selected, replace the Target.
   */
  const handleNodeSelect = useCallback(
    (nodeId: string, label: string) => {
      const prev = selectedNodes;

      if (prev.includes(nodeId)) {
        // Deselect — remove from wherever it is
        actions.setSelectedNodes(prev.filter((id) => id !== nodeId));
        // Clear path when deselecting
        actions.setCalculatedPaths([]);
        actions.setHighlightedPath(null);
        actions.setPathCompareOpen(false);
      } else if (prev.length < 2) {
        // Add to next open slot
        actions.setSelectedNodes([...prev, nodeId]);
      } else {
        // Already have 2 — replace target (slot 1)
        actions.setSelectedNodes([prev[0], nodeId]);
      }

      actions.setNodeLabels({ ...nodeLabels, [nodeId]: label });
    },
    [selectedNodes, nodeLabels, actions],
  );

  const handleFocusSelection = useCallback(() => {
    if (selectedNodes.length === 0 || !refs.graphApiRef.current) return;
    refs.graphApiRef.current.focusNodes(selectedNodes);
  }, [selectedNodes, refs]);

  const handleExportSelection = useCallback(
    (format: "csv" | "bibtex" = "csv") => {
      if (selectedNodes.length === 0 || !refs.graphApiRef.current) return;
      refs.graphApiRef.current.exportSelection(selectedNodes, format);
    },
    [selectedNodes, refs],
  );

  /**
   * Build highlighted node/edge ID sets from a SemanticPath and push to state.
   */
  const highlightPathOnCanvas = useCallback(
    (path: SemanticPath) => {
      if (!refs.graphApiRef.current) return;

      const nodeIds = new Set(path.nodes.map((n) => n.id));

      // Find the actual edge IDs on the graph that connect these path nodes
      const graph = refs.sigmaRef.current?.getGraph();
      const edgeIds = new Set<string>();

      if (graph) {
        for (let i = 0; i < path.nodes.length - 1; i++) {
          const a = path.nodes[i].id;
          const b = path.nodes[i + 1].id;
          const edge = graph.edge(a, b) || graph.edge(b, a);
          if (edge) edgeIds.add(edge);
        }
      }

      actions.setHighlightedPath({ nodeIds, edgeIds });
    },
    [refs, actions],
  );

  /**
   * Calculate paths in all 3 modes between the two selected nodes.
   * Returns the paths and highlights the active mode on the canvas.
   */
  const calculateAllPaths = useCallback(() => {
    if (selectedNodes.length < 2 || !refs.graphApiRef.current) {
      debug.warn("Cannot calculate path: need exactly 2 selected nodes");
      return;
    }

    const [sourceId, targetId] = selectedNodes;
    const modes: PathMode[] = ["shortest", "conflict", "consensus"];
    const allPaths: SemanticPath[] = [];

    for (const mode of modes) {
      try {
        const paths = refs.graphApiRef.current.findPaths(
          sourceId,
          targetId,
          mode,
        );
        allPaths.push(...(paths as SemanticPath[]));
      } catch (err) {
        debug.error(`Error calculating ${mode} path:`, err);
      }
    }

    debug.graph("All paths found:", allPaths);
    actions.setCalculatedPaths(allPaths);
    actions.setPathCompareOpen(true);

    // Highlight the default mode's path on canvas
    const defaultPath =
      allPaths.find((p) => p.id.includes("shortest")) || allPaths[0];
    if (defaultPath) {
      highlightPathOnCanvas(defaultPath);
      actions.setPathMode("shortest");
    }
  }, [selectedNodes, refs, actions, highlightPathOnCanvas]);

  /**
   * Switch which mode's path is highlighted on the canvas.
   */
  const switchPathMode = useCallback(
    (mode: PathMode) => {
      actions.setPathMode(mode);
      const target = calculatedPaths.find((p: SemanticPath) =>
        p.id.includes(mode),
      );
      if (target) {
        highlightPathOnCanvas(target);
      }
    },
    [calculatedPaths, actions, highlightPathOnCanvas],
  );

  /**
   * Clear all path highlights from canvas.
   */
  const clearPathHighlight = useCallback(() => {
    actions.setHighlightedPath(null);
    actions.setCalculatedPaths([]);
    actions.setPathCompareOpen(false);
  }, [actions]);

  return {
    handleNodeSelect,
    handleFocusSelection,
    handleExportSelection,
    calculateAllPaths,
    switchPathMode,
    clearPathHighlight,
  };
}
