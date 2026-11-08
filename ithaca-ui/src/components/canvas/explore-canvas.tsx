"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  SigmaContainer,
  ControlsContainer,
  ZoomControl,
  FullScreenControl,
  useSetSettings,
  useSigma,
} from "@react-sigma/core";
import "@react-sigma/core/lib/react-sigma.min.css";
import { useTheme } from "next-themes";
import Graph from "graphology";
import { NodeCircleProgram } from "sigma/rendering";
import { ForceAtlasControl } from "@/components/canvas/force-atlas-control";
import { TemporalLayoutControl } from "@/components/canvas/temporal-layout-control";
import { restoreForceLayout } from "@/lib/temporal-layout";
import { NodeTooltip } from "@/components/canvas/node-tooltip";
import { EdgeLabels } from "@/components/canvas/edge-labels";
import { CanvasErrorBoundary } from "@/components/canvas/canvas-error-boundary";
import { CanvasLoadingOverlay } from "@/components/canvas/canvas-loading";
import { CanvasEmptyState } from "@/components/canvas/canvas-empty-state";
import { ExploreUrlHydrator } from "@/components/canvas/explore-url-hydrator";
import { E2eEdgeOpener } from "@/components/canvas/e2e-edge-opener";
import { PaperInspector } from "@/components/inspector/paper-inspector";
import { PaperListPanel } from "@/components/canvas/paper-list-panel";
import { List, Swords, Orbit, Table, Sparkles, Filter } from "lucide-react";
import { GlobalFilters } from "@/components/filters/global-filters";
import { DebateMatrixDialog } from "@/components/canvas/debate-matrix-dialog";
import { LiteratureReviewDialog } from "@/components/canvas/literature-review-dialog";
import { QueryBuilderDialog } from "@/components/query/query-builder-dialog";
import type { QueryCondition } from "@/components/query/query-builder";
import { CommandBar } from "@/components/command/command-bar";
import {
  ShareExportDialog,
  ShareButton,
} from "@/components/share/share-export";
import { SaveGraphDialog } from "@/components/canvas/save-graph-dialog";
import { NodeDragControl } from "@/components/canvas/node-drag-control";
import { PaperCountControl } from "@/components/canvas/paper-count-control";
import {
  RelationshipFocusControl,
  type RelationshipFocusType,
} from "@/components/canvas/relationship-focus-control";
import { PerspectiveControl } from "@/components/canvas/perspective-control";
import { BattlefieldToggle } from "@/components/canvas/battlefield-toggle";
import { SchoolsViewControl } from "@/components/canvas/schools-view-control";
import { InstitutionalArchiveToggle } from "@/components/canvas/institutional-archive-toggle";
import {
  NewArgumentToast,
  createThemeAwareHoverDrawer,
  createThemeAwareNodeLabelDrawer,
} from "@/components/canvas/canvas-utils";
import { GraphLoader } from "@/components/canvas/graph-loader";
import { ActiveDebatesDock } from "@/components/canvas/active-debates-dock";
import { ZoomIndicator } from "@/components/canvas/zoom-indicator";
import { EdgeEvidencePopover } from "@/components/canvas/edge-evidence-popover";
import { HydrationStatusPill } from "@/components/canvas/hydration-status-pill";
import {
  CanvasChatPanel,
  ChatToggleButton,
} from "@/components/canvas/canvas-chat-panel";
import { PathComparisonView } from "@/components/canvas/path-comparison";
import {
  NodeSelectionTool,
  SelectionPanel,
  SelectionInstruction,
} from "@/components/canvas/node-selection";
import { debug } from "@/lib/debug";
import { useCanvasKeyboard } from "@/hooks/useCanvasKeyboard";
import { KeyboardShortcutsHelp } from "@/components/canvas/keyboard-shortcuts-help";
import { useTutorial, CANVAS_TUTORIAL } from "@/hooks/useTutorial";
import { TutorialOverlay } from "@/components/canvas/canvas-tutorial";
import { CanvasFooter } from "@/components/canvas/canvas-footer";
import { OnboardingDialog } from "@/components/auth/onboarding-dialog";
import {
  completeOnboarding,
  needsOnboarding,
} from "@/app/(app)/onboarding/actions";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  OverlayManager,
  TopLeftZone,
  TopRightZone,
  TopCenterZone,
  BottomLeftZone,
  BottomCenterZone,
  BottomRightZone,
} from "@/components/canvas/overlay-manager";
import { LABELS, COLORS } from "@/lib/constants";
import type { CanvasInteractionApi } from "@/types/graph";
import type { PaperData } from "@/components/inspector/paper-inspector";
import { graphAPI } from "@/lib/api/graph-api";
import { Button } from "../ui/button";
import { useCanvasStore, type CanvasPerspective } from "@/stores/canvas-store";

// Context hooks
import {
  useCanvasState,
  useCanvasActions,
  useCanvasRefs,
} from "@/contexts/canvas-context";

// Extracted hooks
import { useCanvasInteraction } from "@/hooks/useCanvasInteraction";
import { useCanvasSelection } from "@/hooks/useCanvasSelection";

const SIGMA_CONTAINER_STYLE: React.CSSProperties = {
  height: "100%",
  width: "100%",
  background: "transparent",
};

const STATIC_SIGMA_SETTINGS = {
  allowInvalidContainer: true,
  renderLabels: true,
  labelRenderedSizeThreshold: LABELS.SIZE_THRESHOLD,
  labelDensity: LABELS.DENSITY,
  labelGridCellSize: LABELS.GRID_CELL_SIZE,
  labelColor: { color: "#ffffff" },
  hideEdgesOnMove: true,
  hideLabelsOnMove: true,
  renderEdgeLabels: false,
  zIndex: true,
  defaultEdgeType: "arrow",
  defaultNodeType: "circle",
  nodeProgramClasses: { circle: NodeCircleProgram },
  enableEdgeEvents: true,
  labelFont: LABELS.FONT,
  labelWeight: LABELS.WEIGHT,
} as const;

/**
 * CanvasThemeController dynamically manages Sigma settings (labelColor, hoverDrawer)
 * without triggering SigmaContainer unmount/re-initialization or wiping graph data.
 */
function CanvasThemeController() {
  const { resolvedTheme, theme } = useTheme();
  const isDark = (resolvedTheme || theme) === "dark";
  const setSettings = useSetSettings();
  const sigma = useSigma();

  useEffect(() => {
    const hoverDrawer = createThemeAwareHoverDrawer(isDark);
    const labelDrawer = createThemeAwareNodeLabelDrawer(isDark);
    setSettings({
      labelColor: { color: isDark ? "#ffffff" : "#000000" },
      defaultDrawNodeHover: hoverDrawer,
      defaultDrawNodeLabel: labelDrawer,
    });
    try {
      sigma?.refresh();
    } catch {
      // Sigma may still be mounting
    }
  }, [isDark, setSettings, sigma]);

  return null;
}

// =============================================================================
// MAIN CANVAS COMPONENT
// =============================================================================

export function ExploreCanvas() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const isMobile = useIsMobile();

  // All state from context
  const state = useCanvasState();
  const actions = useCanvasActions();
  const refs = useCanvasRefs();

  // Extracted interaction logic
  const {
    handleNodeClick,
    handleEdgeClick,
    handleEnterFocusMode,
    handleSearchPaper,
    handleCommandAction,
  } = useCanvasInteraction();

  // Extracted selection logic
  const {
    handleNodeSelect,
    handleFocusSelection,
    handleExportSelection,
    calculateAllPaths,
    switchPathMode,
    clearPathHighlight,
  } = useCanvasSelection();

  // Initialize keyboard shortcuts
  useCanvasKeyboard({
    sigma: refs.sigmaRef.current,
    enabled: true,
    onEscape: () => actions.closeAllPanels(),
    onShowHelp: () => actions.setKeyboardHelpOpen(true),
    onResetView: () => refs.resetViewRef.current?.(),
    onToggleFullscreen: () => {
      const container = document.querySelector(".react-sigma");
      if (container) {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          container.requestFullscreen?.();
        }
      }
    },
    onToggleSelection: () => actions.toggleSelectionMode(),
    onToggleChat: () => actions.toggleChat(),
    onTogglePhysics: () => actions.togglePhysics(),
    onExport: () => actions.setShareOpen(true),
  });

  // Initialize tutorial
  const tutorial = useTutorial(CANVAS_TUTORIAL);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const onboardingFinishedRef = useRef(false);

  // Listen for interactive tutorial events to walk and talk the canvas live
  useEffect(() => {
    const handleTourLoadDebate = (e: Event) => {
      const customEvent = e as CustomEvent<{ topic?: string }>;
      const topic =
        customEvent.detail?.topic || "How do transformers handle long context?";
      handleSearchPaper(topic);
    };

    const handleTourSetPerspective = (e: Event) => {
      const customEvent = e as CustomEvent<{ perspective?: CanvasPerspective }>;
      const perspective = customEvent.detail?.perspective || "battlefield";
      actions.setPerspective(perspective);
    };

    const handleTourSetFocus = (e: Event) => {
      const customEvent = e as CustomEvent<{ focus?: string }>;
      const rawFocus = customEvent.detail?.focus || "contradicts";
      const focus = (
        rawFocus === "refutes" ? "contradicts" : rawFocus
      ) as RelationshipFocusType;
      actions.setRelationshipFocus(focus);
    };

    const handleTourToggleChat = () => {
      actions.toggleChat();
    };

    const handleTourToggleSelection = () => {
      actions.toggleSelectionMode();
    };

    const handleTourOpenShortcuts = () => {
      actions.setKeyboardHelpOpen(true);
    };

    window.addEventListener("ithaca-tour-load-debate", handleTourLoadDebate);
    window.addEventListener(
      "ithaca-tour-set-perspective",
      handleTourSetPerspective,
    );
    window.addEventListener("ithaca-tour-set-focus", handleTourSetFocus);
    window.addEventListener("ithaca-tour-toggle-chat", handleTourToggleChat);
    window.addEventListener(
      "ithaca-tour-toggle-selection",
      handleTourToggleSelection,
    );
    window.addEventListener(
      "ithaca-tour-open-shortcuts",
      handleTourOpenShortcuts,
    );

    return () => {
      window.removeEventListener("ithaca-tour-load-debate", handleTourLoadDebate);
      window.removeEventListener(
        "ithaca-tour-set-perspective",
        handleTourSetPerspective,
      );
      window.removeEventListener("ithaca-tour-set-focus", handleTourSetFocus);
      window.removeEventListener(
        "ithaca-tour-toggle-chat",
        handleTourToggleChat,
      );
      window.removeEventListener(
        "ithaca-tour-toggle-selection",
        handleTourToggleSelection,
      );
      window.removeEventListener(
        "ithaca-tour-open-shortcuts",
        handleTourOpenShortcuts,
      );
    };
  }, [actions, handleSearchPaper]);

  const initialCheckDoneRef = useRef(false);

  useEffect(() => {
    if (initialCheckDoneRef.current) return;
    initialCheckDoneRef.current = true;

    void needsOnboarding().then((needed) => {
      if (needed) {
        setShowOnboarding(true);
      } else if (!tutorial.hasSeenTutorial) {
        tutorial.start();
      }
    });
  }, [tutorial]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).__canvasStore = useCanvasStore;
      (window as any).__graphAPI = graphAPI;
      (window as any).__canvasRefs = refs;
    }
  }, [refs]);

  // Keyboard shortcut: 'L' toggles the Paper List panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable
      ) {
        return;
      }
      if (
        (e.key === "l" || e.key === "L") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey
      ) {
        e.preventDefault();
        actions.setListPanelOpen(!state.listPanelOpen);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.listPanelOpen, actions]);

  const handleOnboardingComplete = useCallback(() => {
    if (onboardingFinishedRef.current) return;
    onboardingFinishedRef.current = true;
    setShowOnboarding(false);
    void completeOnboarding();
    if (!tutorial.hasSeenTutorial) {
      tutorial.start();
    }
  }, [tutorial]);

  // Dispute count across the graph (direct from loaded graph edges)
  const disputeCount = useMemo(() => {
    const graph = refs.graphRef.current;
    if (graph) {
      let count = 0;
      graph.forEachEdge((_e, attrs) => {
        if (
          !attrs.hidden &&
          (attrs.edgeType === "contradicts" || attrs.type === "contradicts")
        ) {
          count++;
        }
      });
      if (count > 0) return count;
    }
    return state.schoolsOfThought.reduce((acc, s) => acc + s.disputeCount, 0);
  }, [state.schoolsOfThought, state.refreshTrigger, refs.graphRef]);

  // Upstream foundational roots count
  const upstreamCount = useMemo(() => {
    return state.visiblePapers.filter((p: any) => p.lineageRole === "upstream")
      .length;
  }, [state.visiblePapers]);


  // GraphLoader callback registrations (stable refs, defined once)
  const handleRegisterApi = useCallback(
    (api: CanvasInteractionApi) => {
      refs.graphApiRef.current = api;
    },
    [refs],
  );

  const handleRegisterSigmaGraph = useCallback(
    (sigma: any, graph: Graph) => {
      refs.sigmaRef.current = sigma;
      refs.graphRef.current = graph;
    },
    [refs],
  );

  const handleRegisterExport = useCallback(
    (fn: () => Promise<string>) => {
      refs.exportGraphRef.current = fn;
    },
    [refs],
  );

  const handleRegisterReset = useCallback(
    (fn: () => void) => {
      refs.resetViewRef.current = fn;
    },
    [refs],
  );

  const handleAddToProject = useCallback(
    (nodeId: string) => {
      actions.addSolidNode(nodeId);
    },
    [actions],
  );

  const handleGraphLoaded = useCallback(
    (nodes: PaperData[]) => {
      actions.setVisiblePapers(nodes);
    },
    [actions],
  );

  const handleTooltipExpand = useCallback(
    (
      nodeId: string,
      direction: "in" | "out",
      type?: "all" | "supports" | "contradicts" | "extends",
    ) => {
      refs.graphApiRef.current?.expandNode(nodeId, direction, type);
    },
    [refs],
  );

  const handleTooltipExpandByTopic = useCallback(
    (nodeId: string) => {
      refs.graphApiRef.current?.expandByTopic(nodeId);
    },
    [refs],
  );

  const handleTooltipViewDetails = useCallback(
    (nodeId: string) => {
      const graph = refs.graphRef.current;
      if (!graph || !graph.hasNode(nodeId)) return;
      const attrs = graph.getNodeAttributes(nodeId);

      let supports = attrs.supports || 0;
      let refutes = attrs.refutes || 0;
      let sCount = 0;
      let rCount = 0;
      graph.inEdges(nodeId).forEach((inEdgeKey) => {
        const type = graph.getEdgeAttribute(inEdgeKey, "edgeType");
        if (type === "supports") sCount++;
        if (type === "contradicts") rCount++;
      });
      if (sCount > 0 || rCount > 0) {
        supports = sCount;
        refutes = rCount;
      }

      const paperData = {
        id: attrs.paperId || nodeId,
        title: attrs.title || attrs.label || "Unknown",
        authors: attrs.authors || "Unknown",
        year: attrs.year || 2024,
        venue: attrs.venue,
        arxivId: attrs.arxivId,
        doi: attrs.doi,
        openAccessUrl: attrs.openAccessUrl,
        citations: attrs.citations || 0,
        references: attrs.references || 0,
        supports,
        refutes,
        abstract: attrs.abstract,
        aiSummary: attrs.aiSummary,
        status: attrs.status,
        originalPublicationYear: attrs.originalPublicationYear,
        isReissue: attrs.isReissue,
      };
      graphAPI.getEvidence(nodeId).then((evidence) => {
        handleNodeClick(paperData, evidence);
      });
    },
    [refs, handleNodeClick],
  );

  const handlePaperCountChange = useCallback(
    (count: number) => {
      actions.setPaperCount(count);
      actions.triggerRefresh();
    },
    [actions],
  );

  const handleClearSelection = useCallback(() => {
    actions.clearSelection();
    clearPathHighlight();
  }, [actions, clearPathHighlight]);

  const handleListSelectNode = useCallback(
    async (nodeId: string) => {
      const paper = state.visiblePapers.find((p) => p.id === nodeId);
      if (paper) {
        // Fetch real evidence when selecting from list (same as clicking node)
        const evidence = await graphAPI.getEvidence(nodeId);
        const graph = refs.graphRef.current;
        let supports = paper.supports;
        let refutes = paper.refutes;
        if (graph && graph.hasNode(nodeId)) {
          let sCount = 0;
          let rCount = 0;
          graph.inEdges(nodeId).forEach((inEdgeKey) => {
            const type = graph.getEdgeAttribute(inEdgeKey, "edgeType");
            if (type === "supports") sCount++;
            if (type === "contradicts") rCount++;
          });
          if (sCount > 0 || rCount > 0) {
            supports = sCount;
            refutes = rCount;
          }
        }
        actions.selectPaper({ ...paper, supports, refutes }, evidence);
        if (graph && graph.hasNode(nodeId)) {
          const pos = graph.getNodeAttributes(nodeId);
          refs.sigmaRef.current?.getCamera().animate(
            {
              x: pos.x,
              y: pos.y,
              ratio: 0.5,
            },
            { duration: 600 },
          );
        }
      }
    },
    [state.visiblePapers, actions, refs],
  );

  const handleApplyQueryConditions = useCallback(
    (conditions: QueryCondition[]) => {
      const graph = refs.graphRef.current;
      if (!graph || conditions.length === 0) return;

      const matchingNodeIds: string[] = [];
      graph.forEachNode((nodeId, attrs) => {
        let matchesAll = true;
        for (const cond of conditions) {
          const attrVal = attrs[cond.field];
          if (cond.field === "year" || cond.field === "citations") {
            const numVal = Number(attrVal) || 0;
            if (cond.comparator === "gt") {
              if (!(numVal > Number(cond.value))) matchesAll = false;
            } else if (cond.comparator === "lt") {
              if (!(numVal < Number(cond.value))) matchesAll = false;
            } else if (cond.comparator === "gte") {
              if (!(numVal >= Number(cond.value))) matchesAll = false;
            } else if (cond.comparator === "lte") {
              if (!(numVal <= Number(cond.value))) matchesAll = false;
            } else if (cond.comparator === "equals") {
              if (!(numVal === Number(cond.value))) matchesAll = false;
            } else if (
              cond.comparator === "between" &&
              Array.isArray(cond.value)
            ) {
              if (!(numVal >= cond.value[0] && numVal <= cond.value[1]))
                matchesAll = false;
            }
          } else {
            const strVal = String(attrVal || "").toLowerCase();
            const target = String(cond.value).toLowerCase();
            if (cond.comparator === "contains") {
              if (!strVal.includes(target)) matchesAll = false;
            } else if (cond.comparator === "equals") {
              if (strVal !== target) matchesAll = false;
            }
          }
          if (!matchesAll) break;
        }
        if (matchesAll) matchingNodeIds.push(nodeId);
      });

      if (matchingNodeIds.length > 0) {
        actions.setSelectedNodes(matchingNodeIds);
        refs.graphApiRef.current?.focusNodes(matchingNodeIds);
        actions.showToastMessage(
          `Query matched ${matchingNodeIds.length} paper${matchingNodeIds.length === 1 ? "" : "s"} on canvas.`,
        );
      } else {
        actions.showToastMessage(
          "No papers on canvas matched the query conditions.",
        );
      }
    },
    [refs, actions],
  );

  return (
    <div className="flex h-full w-full flex-row">
      <Suspense fallback={null}>
        <ExploreUrlHydrator onSearchPaper={handleSearchPaper} />
        <E2eEdgeOpener />
      </Suspense>
      {/* Main Canvas Area */}
      <div className="relative h-full min-w-[320px] flex-1 overflow-x-auto bg-[#F6F7F8] dark:bg-[#0B0C10] transition-colors">
        <CanvasErrorBoundary
          onError={(error) => debug.error("Canvas rendering error:", error)}
        >
          <SigmaContainer
            style={SIGMA_CONTAINER_STYLE}
            settings={STATIC_SIGMA_SETTINGS}
          >
            <CanvasThemeController />
            <GraphLoader
              onNodeClick={handleNodeClick}
              onEdgeClick={handleEdgeClick}
              onStatsChange={actions.setGraphStats}
              onDataRangesChange={actions.setDataRanges}
              onFilterStatsChange={actions.setFilterStats}
              onRegisterInteractionApi={handleRegisterApi}
              onRegisterSigmaGraph={handleRegisterSigmaGraph}
              onRegisterExport={handleRegisterExport}
              onRegisterReset={handleRegisterReset}
              onNodeSelect={handleNodeSelect}
              onAddToProject={handleAddToProject}
              onGraphLoaded={handleGraphLoaded}
              onHoverNode={actions.setHoveredNode}
              filters={state.filters}
              paperCount={state.paperCount}
              refreshTrigger={state.refreshTrigger}
              selectionMode={state.selectionMode}
              focusNode={state.searchTarget}
              focusModeNode={state.focusModeNode}
              solidNodes={state.solidNodes}
              hoveredNode={state.hoveredNode}
              relationshipFocus={state.relationshipFocus}
              selectedNodes={state.selectedNodes}
              highlightedPath={state.highlightedPath}
            />

            {/* Sigma-managed internal components */}
            <NodeDragControl />
            <NodeTooltip
              onExpand={handleTooltipExpand}
              onExpandByTopic={handleTooltipExpandByTopic}
              onFocus={handleEnterFocusMode}
              onViewDetails={handleTooltipViewDetails}
            />
            <EdgeLabels />

            {/* Sigma controls: hide zoom buttons on mobile (pinch-to-zoom instead) */}
            <ControlsContainer position={"top-right"}>
              {!isMobile && <ZoomControl />}
              {!isMobile && <FullScreenControl />}
              {!isMobile && (
                <ForceAtlasControl
                  externalIsRunning={
                    state.physicsEnabled && state.layoutMode === "force"
                  }
                  onToggle={() => {
                    if (state.layoutMode === "temporal") {
                      const graph = refs.graphRef.current;
                      if (graph) {
                        restoreForceLayout(graph);
                        refs.sigmaRef.current?.refresh();
                      }
                      actions.setLayoutMode("force");
                    }
                    actions.togglePhysics();
                  }}
                  nodeCount={state.graphStats.nodeCount}
                />
              )}
              {!isMobile && (
                <TemporalLayoutControl
                  layoutMode={state.layoutMode}
                  onChange={(mode) => actions.setLayoutMode(mode)}
                  minYear={state.dataRanges.minYear}
                  maxYear={state.dataRanges.maxYear}
                />
              )}
            </ControlsContainer>

            {!isMobile && <ZoomIndicator />}
          </SigmaContainer>
        </CanvasErrorBoundary>

        {/* Empty State */}
        {!state.isLoading && state.graphStats.nodeCount === 0 && !state.searchTarget && (
          <CanvasEmptyState
            relationshipFocus={state.relationshipFocus}
            onRelationshipFocusChange={(focus) =>
              actions.setRelationshipFocus(focus)
            }
            onSearchSelect={handleSearchPaper}
            onSearchClick={() => {
              document.dispatchEvent(
                new KeyboardEvent("keydown", {
                  key: "k",
                  metaKey: true,
                  ctrlKey: true,
                  bubbles: true,
                }),
              );
            }}
          />
        )}

        <CanvasLoadingOverlay
          isLoading={state.isLoading}
          message="Loading graph..."
        />

        {/* ========== STRUCTURED OVERLAY SYSTEM ========== */}
        <OverlayManager>
          {/* Top-left: filters & paper count (desktop/tablet only) */}
          {!isMobile && (
            <TopLeftZone className="flex flex-col gap-2">
              <div className="bg-card/90 dark:bg-card/85 border-border/80 flex items-center gap-1.5 rounded-xl border p-1 shadow-md backdrop-blur-md">
                <GlobalFilters
                  filters={state.filters}
                  onFiltersChange={actions.setFilters}
                  hiddenEdgeCount={state.filterStats.hiddenEdges}
                  open={state.filtersOpen}
                  onToggle={() => actions.toggleFilters()}
                  maxCitations={state.dataRanges.maxCitations}
                  minYear={state.dataRanges.minYear}
                  maxYear={state.dataRanges.maxYear}
                  onOpenQueryBuilder={() => actions.setQueryBuilderOpen(true)}
                />
                <div className="bg-border/60 h-5 w-px" />
                <SchoolsViewControl schoolCount={state.schoolsOfThought.length} />
                <div className="bg-border/60 h-5 w-px" />
                <InstitutionalArchiveToggle
                  active={state.sovereignFilterActive}
                  onToggle={() => actions.toggleSovereignFilter()}
                />
                <div className="bg-border/60 h-5 w-px" />
                <PaperCountControl
                  count={state.paperCount}
                  onChange={handlePaperCountChange}
                  onRefresh={() => actions.triggerRefresh()}
                  isLoading={state.isLoading}
                  embedded
                />
              </div>
            </TopLeftZone>
          )}

          {/* Top-right: contextual action buttons (desktop only) */}
          {!isMobile && (
            <TopRightZone>
              <div className="flex flex-col gap-2">
                <Button
                  variant={state.listPanelOpen ? "default" : "outline"}
                  size="icon"
                  className="pointer-events-auto z-30 h-9 w-9 rounded-full shadow-md"
                  onClick={() => actions.setListPanelOpen(!state.listPanelOpen)}
                  title="Toggle List View"
                >
                  <List className="h-4 w-4" />
                </Button>
                <div data-tour="ai-chat" className="inline-block">
                  <ChatToggleButton
                    isOpen={state.chatOpen}
                    onClick={() => actions.toggleChat()}
                  />
                </div>
                <div data-tour="selection-mode" className="inline-block">
                  <NodeSelectionTool
                    isActive={state.selectionMode}
                    onToggle={() => actions.toggleSelectionMode()}
                    selectedNodes={state.selectedNodes}
                    nodeLabels={state.nodeLabels}
                  />
                </div>
                <Button
                  variant={state.debateMatrixOpen ? "default" : "outline"}
                  size="icon"
                  className="pointer-events-auto z-30 h-9 w-9 rounded-full shadow-md transition-colors hover:border-indigo-500 hover:text-indigo-600"
                  onClick={() => actions.setDebateMatrixOpen(true)}
                  title="Open Debate Matrix (Dialectic Refutations & Confirmations)"
                >
                  <Table className="h-4 w-4 text-indigo-500" />
                </Button>
                <Button
                  variant={state.literatureReviewOpen ? "default" : "outline"}
                  size="icon"
                  className="pointer-events-auto z-30 h-9 w-9 rounded-full shadow-md transition-colors hover:border-violet-500 hover:text-violet-600"
                  onClick={() => actions.setLiteratureReviewOpen(true)}
                  title="Synthesize Literature Review (Foundations, Clashes & Horizons)"
                >
                  <Sparkles className="h-4 w-4 text-violet-500" />
                </Button>
                <Button
                  variant={state.queryBuilderOpen ? "default" : "outline"}
                  size="icon"
                  className="pointer-events-auto z-30 h-9 w-9 rounded-full shadow-md transition-colors hover:border-emerald-500 hover:text-emerald-600"
                  onClick={() => actions.setQueryBuilderOpen(true)}
                  title="Open Advanced Relational Query Builder"
                >
                  <Filter className="h-4 w-4 text-emerald-500" />
                </Button>
              </div>
            </TopRightZone>
          )}

          <TopCenterZone className="flex flex-col items-center gap-2">
            {state.focusModeNode && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                <div className="bg-primary/90 text-primary-foreground border-primary-foreground/20 flex items-center gap-3 rounded-full border px-4 py-2 shadow-lg backdrop-blur-md">
                  <div className="flex flex-col items-center leading-none">
                    <span className="text-[10px] font-medium tracking-widest uppercase opacity-80">
                      Focus Mode
                    </span>
                  </div>
                  <div className="bg-primary-foreground/30 h-4 w-px" />
                  <button
                    onClick={() => actions.setFocusModeNode(null)}
                    className="rounded px-2 py-1 text-xs font-bold transition-colors hover:bg-white/20"
                  >
                    Exit Focus
                  </button>
                </div>
              </div>
            )}
            {state.perspective === "battlefield" && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                <div className="flex items-center gap-2.5 rounded-full border border-red-400/30 bg-red-600/90 px-4 py-1.5 text-white shadow-lg backdrop-blur-md">
                  <Swords className="h-3.5 w-3.5 animate-pulse" />
                  <span className="text-xs font-bold tracking-wide uppercase">
                    Battlefield Mode
                  </span>
                  <span className="text-[11px] opacity-85">
                    {disputeCount > 0
                      ? `${disputeCount} controversies active`
                      : "Debate crucible (0% upstream noise)"}
                  </span>
                  <div className="mx-0.5 h-3.5 w-px bg-white/20" />
                  <button
                    onClick={() => actions.setDebateMatrixOpen(true)}
                    className="flex items-center gap-1 rounded bg-white/15 px-2 py-0.5 text-[11px] font-bold transition-colors hover:bg-white/25"
                    title="View Debate Matrix"
                  >
                    <Table className="h-3 w-3" />
                    Matrix
                  </button>
                  <div className="mx-0.5 h-3.5 w-px bg-white/20" />
                  <button
                    onClick={() => actions.setPerspective("synthesis")}
                    className="rounded px-1.5 py-0.5 text-[11px] font-bold transition-colors hover:bg-white/20"
                    title="Show full 360° synthesis"
                  >
                    360° View
                  </button>
                </div>
              </div>
            )}
            {state.perspective === "foundations" && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                <div className="flex items-center gap-2.5 rounded-full border border-amber-400/30 bg-amber-600/90 px-4 py-1.5 text-white shadow-lg backdrop-blur-md">
                  <span className="text-xs font-bold tracking-wide uppercase">
                    🏛️ Lineage & Foundations
                  </span>
                  <span className="text-[11px] opacity-85">
                    {upstreamCount > 0
                      ? `${upstreamCount} foundational roots`
                      : "Seminal ancestry"}
                  </span>
                  <div className="mx-0.5 h-3.5 w-px bg-white/20" />
                  <button
                    onClick={() => actions.setPerspective("battlefield")}
                    className="rounded px-1.5 py-0.5 text-[11px] font-bold transition-colors hover:bg-white/20"
                    title="Return to Battlefield"
                  >
                    Battlefield
                  </button>
                </div>
              </div>
            )}
            {state.perspective === "synthesis" && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                <div className="flex items-center gap-2.5 rounded-full border border-indigo-400/30 bg-indigo-600/90 px-4 py-1.5 text-white shadow-lg backdrop-blur-md">
                  <span className="text-xs font-bold tracking-wide uppercase">
                    🌐 360° Synthesis
                  </span>
                  <span className="text-[11px] opacity-85">
                    West: Roots · Center: Claim · East: Debates
                  </span>
                  <div className="mx-0.5 h-3.5 w-px bg-white/20" />
                  <button
                    onClick={() => actions.setPerspective("battlefield")}
                    className="rounded px-1.5 py-0.5 text-[11px] font-bold transition-colors hover:bg-white/20"
                    title="Focus on Battlefield"
                  >
                    Battlefield
                  </button>
                </div>
              </div>
            )}
            {state.sovereignFilterActive && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-300">
                <div className="flex items-center gap-2.5 rounded-full border border-emerald-400/30 bg-emerald-700/90 px-4 py-1.5 text-white shadow-lg backdrop-blur-md">
                  <span className="text-sm leading-none">🏛️</span>
                  <span className="text-xs font-bold tracking-wide uppercase">
                    Open Archives Active
                  </span>
                  <span className="text-[11px] opacity-85">
                    Highlighting verified institutional repository & university
                    literature
                  </span>
                  <div className="mx-0.5 h-3.5 w-px bg-white/20" />
                  <button
                    onClick={() => actions.setSovereignFilterActive(false)}
                    className="rounded px-1.5 py-0.5 text-[11px] font-bold transition-colors hover:bg-white/20"
                  >
                    Exit
                  </button>
                </div>
              </div>
            )}
            {state.graphStats.nodeCount > 40 &&
              state.clusterViewMode === "papers" && (
                <div className="animate-in fade-in duration-300">
                  <button
                    onClick={() => actions.setClusterViewMode("schools")}
                    className="flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-950/80 px-3 py-1 text-xs text-indigo-200 shadow-md backdrop-blur-md transition-colors hover:bg-indigo-900/90"
                  >
                    <Orbit className="h-3.5 w-3.5" />
                    <span>
                      Dense network ({state.graphStats.nodeCount} papers) —
                      Switch to Schools of Thought?
                    </span>
                  </button>
                </div>
              )}
            <HydrationStatusPill />
          </TopCenterZone>

          {/* Bottom-left: footer (desktop/tablet only) */}
          {!isMobile && (
            <BottomLeftZone className="z-40 pointer-events-auto">
              <div data-tour="zoom-controls">
                <CanvasFooter
                  nodeCount={state.graphStats.nodeCount}
                  edgeCount={state.graphStats.edgeCount}
                  status={state.isLoading ? "loading" : "live"}
                  onKeyboardHelpClick={() => actions.setKeyboardHelpOpen(true)}
                  onTutorialClick={tutorial.start}
                  onTutorialRestart={tutorial.reset}
                  hasSeenTutorial={tutorial.hasSeenTutorial}
                />
              </div>
            </BottomLeftZone>
          )}

          {/* Bottom-center: mode tabs + selection panel */}
          <BottomCenterZone>
            {/* Perspective & Relationship mode tabs — always visible */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div data-tour="battlefield-mode">
                <PerspectiveControl
                  disputeCount={disputeCount}
                  upstreamCount={upstreamCount}
                />
              </div>
              <div data-tour="relationship-filters">
                <RelationshipFocusControl
                  value={state.relationshipFocus}
                  onChange={(focus) => actions.setRelationshipFocus(focus)}
                />
              </div>
            </div>
            <SelectionPanel
              selectedNodes={state.selectedNodes}
              nodeLabels={state.nodeLabels}
              onClearSelection={handleClearSelection}
              onRemoveNode={actions.removeSelectedNode}
              onFocusSelection={handleFocusSelection}
              onCompare={calculateAllPaths}
              onExport={handleExportSelection}
            />
            <SelectionInstruction
              isActive={state.selectionMode}
              selectedCount={state.selectedNodes.length}
            />
            <NewArgumentToast
              show={state.showToast}
              message={state.toastMessage}
              onClose={() => actions.setShowToast(false)}
            />
          </BottomCenterZone>

          {/* Bottom-right: active debates dock + save + share (desktop only) */}
          {!isMobile && (
            <BottomRightZone className="flex flex-col items-end gap-2.5">
              <ActiveDebatesDock
                graph={refs.graphRef.current}
                sigma={refs.sigmaRef.current}
                onEdgeClick={handleEdgeClick}
                onOpenDebateMatrix={() => actions.setDebateMatrixOpen(true)}
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => actions.setSaveDialogOpen(true)}
                  className="bg-card/90 border-border hover:bg-muted flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium shadow-sm backdrop-blur transition-colors"
                  title="Save graph to dashboard"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                  </svg>
                  Save
                </button>
                <ShareButton onClick={() => actions.setShareOpen(true)} />
              </div>
            </BottomRightZone>
          )}
        </OverlayManager>

        {/* List Panel */}
        <PaperListPanel
          open={state.listPanelOpen}
          onOpenChange={actions.setListPanelOpen}
          papers={state.visiblePapers}
          hoveredNode={state.hoveredNode}
          onHoverNode={actions.setHoveredNode}
          onSelectNode={handleListSelectNode}
        />

        {/* Contextual Overlays & Modals */}
        <PaperInspector
          paper={state.selectedPaper}
          evidence={state.paperEvidence}
          open={state.inspectorOpen}
          onOpenChange={actions.setInspectorOpen}
          side={isMobile ? "bottom" : "right"}
          className={isMobile ? "h-[85%] rounded-t-xl" : undefined}
        />

        <CommandBar
          onSelectPaper={handleSearchPaper}
          onAction={handleCommandAction}
          hideTrigger={true}
        />

        <ShareExportDialog
          open={state.shareOpen}
          onOpenChange={actions.setShareOpen}
          graphTitle={
            state.searchTarget
              ? state.searchTarget.startsWith("topic-")
                ? state.searchTarget.replace("topic-", "")
                : "Citation Network"
              : "Citation Network"
          }
          searchQuery={state.searchTarget ?? undefined}
          nodeCount={state.graphStats.nodeCount}
          edgeCount={state.graphStats.edgeCount}
          sigma={refs.sigmaRef.current}
          graph={refs.graphRef.current}
        />

        <SaveGraphDialog
          open={state.saveDialogOpen}
          onOpenChange={actions.setSaveDialogOpen}
          defaultTitle={
            state.searchTarget
              ? state.searchTarget.startsWith("topic-")
                ? state.searchTarget.replace("topic-", "")
                : "Citation Network"
              : "Citation Network"
          }
          searchQuery={state.searchTarget ?? undefined}
          nodeCount={state.graphStats.nodeCount}
          edgeCount={state.graphStats.edgeCount}
        />

        <EdgeEvidencePopover
          evidence={state.edgeEvidence}
          position={state.edgeEvidencePos}
          onClose={() => actions.clearEdgeEvidence()}
          onViewPaper={(paperId) => handleSearchPaper(paperId)}
          onDispute={(edgeId) => {
            debug.log("Dispute edge requested:", edgeId);
            actions.showToastMessage(
              "Dispute flagged — use Edit to correct the relationship",
            );
          }}
          onCorrect={(edgeId, type, comment) => {
            debug.log("Correction submitted:", { edgeId, type, comment });

            // Apply the correction to the user's local graph in real-time
            const graph = refs.graphRef.current;
            const sigma = refs.sigmaRef.current;
            if (graph && sigma && graph.hasEdge(edgeId)) {
              const EDGE_COLOR_MAP: Record<string, string> = {
                supports: COLORS.SUPPORTS,
                contradicts: COLORS.CONTRADICTS,
                extends: COLORS.EXTENDS,
                cites: COLORS.CITES || "#a1a1aa",
                unknown: COLORS.UNKNOWN || "#94a3b8",
              };
              const newColor = EDGE_COLOR_MAP[type] || "#e5e7eb";

              graph.setEdgeAttribute(edgeId, "edgeType", type);
              graph.setEdgeAttribute(edgeId, "color", newColor);
              graph.setEdgeAttribute(edgeId, "originalColor", newColor);
              graph.setEdgeAttribute(edgeId, "confidence", 100);
              graph.setEdgeAttribute(edgeId, "signalSource", "user-correction");
              graph.setEdgeAttribute(
                edgeId,
                "snippet",
                comment
                  ? `User correction: ${comment}`
                  : `User corrected relationship to "${type}".`,
              );
              graph.setEdgeAttribute(edgeId, "provider", "user-correction");
              sigma.refresh();

              // Persist to DB in background
              const source = graph.source(edgeId);
              const target = graph.target(edgeId);
              fetch("/api/classify/correct", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  citingId: source,
                  citedId: target,
                  edgeType: type === "refutes" ? "contradicts" : type,
                  comment,
                }),
              }).catch((err) => {
                debug.log("Failed to persist correction:", err);
              });
            }

            // Close the popover and show confirmation
            actions.clearEdgeEvidence();
            actions.showToastMessage(`Relationship corrected to "${type}"`);
          }}
        />

        <PathComparisonView
          isOpen={state.pathCompareOpen}
          onClose={() => {
            actions.setPathCompareOpen(false);
            clearPathHighlight();
          }}
          paths={state.calculatedPaths}
          currentMode={state.pathMode}
          onModeChange={switchPathMode}
        />

        <OnboardingDialog
          open={showOnboarding}
          onOpenChange={(open) => {
            if (!open) handleOnboardingComplete();
            else setShowOnboarding(true);
          }}
          onComplete={handleOnboardingComplete}
        />

        <KeyboardShortcutsHelp
          open={state.keyboardHelpOpen}
          onOpenChange={actions.setKeyboardHelpOpen}
        />

        <DebateMatrixDialog
          open={state.debateMatrixOpen}
          onOpenChange={actions.setDebateMatrixOpen}
          graph={refs.graphRef.current}
          topic={state.searchTarget || undefined}
          onOpenSynthesizer={() => {
            actions.setDebateMatrixOpen(false);
            actions.setLiteratureReviewOpen(true);
          }}
        />

        <LiteratureReviewDialog
          open={state.literatureReviewOpen}
          onOpenChange={actions.setLiteratureReviewOpen}
          graph={refs.graphRef.current}
          topic={state.searchTarget || undefined}
          onOpenDebateMatrix={() => {
            actions.setLiteratureReviewOpen(false);
            actions.setDebateMatrixOpen(true);
          }}
        />

        <QueryBuilderDialog
          open={state.queryBuilderOpen}
          onOpenChange={actions.setQueryBuilderOpen}
          onApplyConditions={handleApplyQueryConditions}
        />

        <TutorialOverlay
          isActive={tutorial.isActive}
          step={tutorial.currentStep}
          stepIndex={tutorial.currentStepIndex}
          totalSteps={tutorial.totalSteps}
          progress={tutorial.progress}
          isLastStep={tutorial.isLastStep}
          showSkip={true}
          showProgress={true}
          onNext={tutorial.next}
          onPrevious={tutorial.previous}
          onSkip={tutorial.skip}
        />
      </div>

      {/* Chat Panel - Split View */}
      <CanvasChatPanel
        isOpen={state.chatOpen}
        onClose={() => actions.setChatOpen(false)}
        graphContext={{
          nodeCount: state.graphStats.nodeCount,
          edgeCount: state.graphStats.edgeCount,
          selectedNode: state.selectedNodes[0] || null,
          papers: state.visiblePapers.slice(0, 30).map((p) => ({
            id: p.id,
            title: p.title,
            authors: p.authors,
            year: p.year,
            citations: p.citations,
            supports: p.supports,
            refutes: p.refutes,
          })),
        }}
        onNavigateToPaper={handleSearchPaper}
        onSelectPaper={handleListSelectNode}
        onFocusNode={(nodeId) => {
          refs.graphApiRef.current?.focusNodes([nodeId]);
        }}
      />
    </div>
  );
}
