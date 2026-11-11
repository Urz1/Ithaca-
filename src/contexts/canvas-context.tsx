"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useEffect,
  ReactNode,
} from "react";
import type Graph from "graphology";
import type { Sigma } from "sigma";
import type { CanvasInteractionApi } from "@/types/graph";
import { useCanvasStore } from "@/stores/canvas-store";

// =============================================================================
// REFS CONTEXT (Sigma, Graph instances scoped to component lifecycle)
// =============================================================================

interface CanvasRefs {
  sigmaRef: React.MutableRefObject<Sigma | null>;
  graphRef: React.MutableRefObject<Graph | null>;
  graphApiRef: React.MutableRefObject<CanvasInteractionApi | null>;
  exportGraphRef: React.MutableRefObject<(() => Promise<string>) | null>;
  resetViewRef: React.MutableRefObject<(() => void) | null>;
}

const CanvasRefsContext = createContext<CanvasRefs | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface CanvasProviderProps {
  children: ReactNode;
}

export function CanvasProvider({ children }: CanvasProviderProps) {
  const sigmaRef = React.useRef<Sigma | null>(null);
  const graphRef = React.useRef<Graph | null>(null);
  const graphApiRef = React.useRef<CanvasInteractionApi | null>(null);
  const exportGraphRef = React.useRef<(() => Promise<string>) | null>(null);
  const resetViewRef = React.useRef<(() => void) | null>(null);

  const refs = useMemo(
    () => ({ sigmaRef, graphRef, graphApiRef, exportGraphRef, resetViewRef }),
    [],
  );

  useEffect(() => {
    return () => {
      useCanvasStore.getState().reset();
    };
  }, []);

  return (
    <CanvasRefsContext.Provider value={refs}>
      {children}
    </CanvasRefsContext.Provider>
  );
}

// =============================================================================
// HOOKS
// =============================================================================

export function useCanvasRefs(): CanvasRefs {
  const refs = useContext(CanvasRefsContext);
  if (!refs) {
    throw new Error("useCanvasRefs must be used within a CanvasProvider");
  }
  return refs;
}

/**
 * Convenience hook — returns stable actions object from the Zustand store.
 * Components using this do NOT re-render when state changes (actions are stable).
 */
export function useCanvasActions() {
  return useMemo(() => {
    return {
      // UI
      setShowToast: useCanvasStore.getState().setShowToast,
      setInspectorOpen: useCanvasStore.getState().setInspectorOpen,
      setFiltersOpen: useCanvasStore.getState().setFiltersOpen,
      setShareOpen: useCanvasStore.getState().setShareOpen,
      setSaveDialogOpen: useCanvasStore.getState().setSaveDialogOpen,
      setChatOpen: useCanvasStore.getState().setChatOpen,
      setKeyboardHelpOpen: useCanvasStore.getState().setKeyboardHelpOpen,
      setPathCompareOpen: useCanvasStore.getState().setPathCompareOpen,
      setListPanelOpen: useCanvasStore.getState().setListPanelOpen,
      setDebateMatrixOpen: useCanvasStore.getState().setDebateMatrixOpen,
      setLiteratureReviewOpen:
        useCanvasStore.getState().setLiteratureReviewOpen,
      setQueryBuilderOpen: useCanvasStore.getState().setQueryBuilderOpen,
      toggleFilters: useCanvasStore.getState().toggleFilters,
      toggleChat: useCanvasStore.getState().toggleChat,
      toggleSelectionMode: useCanvasStore.getState().toggleSelectionMode,
      togglePhysics: useCanvasStore.getState().togglePhysics,
      closeAllPanels: useCanvasStore.getState().closeAllPanels,
      showToastMessage: useCanvasStore.getState().showToastMessage,

      // Loading & Hydration
      setLoading: useCanvasStore.getState().setLoading,
      setHydrationState: useCanvasStore.getState().setHydrationState,
      resetHydrationState: useCanvasStore.getState().resetHydrationState,

      // Graph Data
      setGraphStats: useCanvasStore.getState().setGraphStats,
      setDataRanges: useCanvasStore.getState().setDataRanges,
      setFilterStats: useCanvasStore.getState().setFilterStats,
      setFilters: useCanvasStore.getState().setFilters,
      setPaperCount: useCanvasStore.getState().setPaperCount,
      triggerRefresh: useCanvasStore.getState().triggerRefresh,
      setSolidNodes: useCanvasStore.getState().setSolidNodes,
      addSolidNode: useCanvasStore.getState().addSolidNode,
      setVisiblePapers: useCanvasStore.getState().setVisiblePapers,
      setHoveredNode: useCanvasStore.getState().setHoveredNode,

      // Selection
      setSelectionMode: useCanvasStore.getState().setSelectionMode,
      setSelectedNodes: useCanvasStore.getState().setSelectedNodes,
      addSelectedNode: useCanvasStore.getState().addSelectedNode,
      removeSelectedNode: useCanvasStore.getState().removeSelectedNode,
      clearSelection: useCanvasStore.getState().clearSelection,
      setNodeLabels: useCanvasStore.getState().setNodeLabels,

      // Paper Inspector
      selectPaper: useCanvasStore.getState().selectPaper,
      clearSelectedPaper: useCanvasStore.getState().clearSelectedPaper,

      // Edge Evidence
      showEdgeEvidence: useCanvasStore.getState().showEdgeEvidence,
      clearEdgeEvidence: useCanvasStore.getState().clearEdgeEvidence,

      // Path Comparison
      setCalculatedPaths: useCanvasStore.getState().setCalculatedPaths,
      setPathMode: useCanvasStore.getState().setPathMode,
      setHighlightedPath: useCanvasStore.getState().setHighlightedPath,

      // Search & Focus
      setSearchTarget: useCanvasStore.getState().setSearchTarget,
      setFocusModeNode: useCanvasStore.getState().setFocusModeNode,
      setRelationshipFocus: useCanvasStore.getState().setRelationshipFocus,

      // Features
      setPhysicsEnabled: useCanvasStore.getState().setPhysicsEnabled,
      setTutorialActive: useCanvasStore.getState().setTutorialActive,
      setLayoutMode: useCanvasStore.getState().setLayoutMode,

      // Topology Intelligence & Perspective
      setPerspective: useCanvasStore.getState().setPerspective,
      toggleBattlefieldMode: useCanvasStore.getState().toggleBattlefieldMode,
      setBattlefieldMode: useCanvasStore.getState().setBattlefieldMode,
      setClusterViewMode: useCanvasStore.getState().setClusterViewMode,
      toggleSchoolExpansion: useCanvasStore.getState().toggleSchoolExpansion,
      setSchoolsOfThought: useCanvasStore.getState().setSchoolsOfThought,

      // Sovereign Indexing
      setSovereignFilterActive:
        useCanvasStore.getState().setSovereignFilterActive,
      toggleSovereignFilter: useCanvasStore.getState().toggleSovereignFilter,
    };
  }, []);
}

/**
 * Backward-compat hook — subscribes to ALL state (same as before).
 * Prefer using useCanvasStore(selector) for targeted subscriptions.
 */
export function useCanvasState() {
  return useCanvasStore();
}
