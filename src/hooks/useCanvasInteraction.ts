"use client";

import { useCallback } from "react";
import { useCanvasActions, useCanvasRefs } from "@/contexts/canvas-context";
import { useCanvasStore } from "@/stores/canvas-store";
import { graphAPI } from "@/lib/api/graph-api";
import { debug } from "@/lib/debug";
import type {
  PaperData,
  EvidenceItem,
} from "@/components/inspector/paper-inspector";
import type { EdgeEvidence } from "@/components/canvas/edge-evidence-popover";

/**
 * Hook for canvas interaction logic: node clicks, edge clicks, focus mode,
 * search, and graph expansion.
 */
export function useCanvasInteraction() {
  const actions = useCanvasActions();
  const refs = useCanvasRefs();
  const paperCount = useCanvasStore((s) => s.paperCount);
  const relationshipFocus = useCanvasStore((s) => s.relationshipFocus);

  const handleNodeClick = useCallback(
    (paper: PaperData, evidence: EvidenceItem[]) => {
      actions.selectPaper(paper, evidence);
    },
    [actions],
  );

  const handleEdgeClick = useCallback(
    (
      edgeId: string,
      position: { x: number; y: number },
      evidence: EdgeEvidence,
    ) => {
      actions.showEdgeEvidence(evidence, position);
    },
    [actions],
  );

  const handleEnterFocusMode = useCallback(
    (nodeId: string) => {
      actions.setFocusModeNode(nodeId);
      refs.graphApiRef.current?.focusNodes([nodeId]);
    },
    [actions, refs],
  );

  const handleSearchPaper = useCallback(
    async (paperId: string) => {
      debug.search("Search for paper:", paperId);
      actions.setSearchTarget(paperId);
      actions.setLoading(true);

      try {
        const isQuestion = paperId.startsWith("question-");
        const isTopic = paperId.startsWith("topic-") || isQuestion;

        let nodes: any[] = [];
        let edges: any[] = [];

        if (isTopic) {
          const query = paperId
            .replace(/^question-/, "")
            .replace(/^topic-/, "");
          const sliceSize = isQuestion
            ? Math.min(Math.max(paperCount, 40), 80)
            : paperCount;
          const data = await graphAPI.fetchTopicSlice(query, sliceSize);
          nodes = data.nodes;
          edges = data.edges;
          if (isQuestion) {
            actions.setRelationshipFocus("contradicts");
          }
        } else {
          const data = await graphAPI.fetchPaperContext(paperId, paperCount);
          nodes = data.nodes;
          edges = data.edges;
        }

        // Apply relationship focus filter: keep only edges matching the selected type.
        // Questions bias toward contradictions but still show the full map first.
        const focus = isQuestion ? "all" : relationshipFocus;
        if (focus !== "all") {
          edges = edges.filter((e: any) => e.edgeType === focus);
        } else if (isQuestion) {
          // Surface contradictions first without hiding the rest of the debate.
          edges = [...edges].sort((a, b) => {
            const rank = (type: string) =>
              type === "contradicts" ? 0 : type === "supports" ? 1 : 2;
            return rank(a.edgeType) - rank(b.edgeType);
          });
        }

        // Handle orphan nodes (nodes with no edges)
        {
          const connectedNodeIds = new Set<string>();
          for (const e of edges) {
            connectedNodeIds.add(e.source);
            connectedNodeIds.add(e.target);
          }

          if (isTopic) {
            // Topic search: keep all nodes but mark orphans for visual distinction
            nodes = nodes.map((n: any) => ({
              ...n,
              isOrphan: !connectedNodeIds.has(n.id),
            }));
          } else {
            // Paper-specific search: remove orphans (every node should be there via citation)
            connectedNodeIds.add(paperId);
            nodes = nodes.filter((n: any) => connectedNodeIds.has(n.id));
          }
        }

        if (refs.graphApiRef.current) {
          refs.graphApiRef.current.addGraphData(nodes, edges, true);
          if (!isTopic) {
            refs.graphApiRef.current.focusNodes([paperId]);
          }
        }

        // Update the paper list panel with newly loaded papers
        if (nodes.length > 0) {
          actions.setVisiblePapers(nodes);
        }
      } catch (e) {
        debug.error("Search failed", e);
      } finally {
        actions.setLoading(false);
      }
    },
    [actions, refs, paperCount, relationshipFocus],
  );

  const handleCommandAction = useCallback(
    (action: string) => {
      switch (action) {
        case "open-filters":
          actions.setFiltersOpen(true);
          break;
        case "export":
          actions.setShareOpen(true);
          break;
        case "toggle-physics":
          actions.togglePhysics();
          break;
        case "reset-view":
          refs.resetViewRef.current?.();
          break;
        case "shortcuts":
        case "settings":
          break;
        default:
          debug.log("Unhandled action:", action);
      }
    },
    [actions, refs],
  );

  return {
    handleNodeClick,
    handleEdgeClick,
    handleEnterFocusMode,
    handleSearchPaper,
    handleCommandAction,
  };
}
