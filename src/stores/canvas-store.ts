import { create } from "zustand";
import type { FilterState } from "@/components/filters/global-filters";
import type {
  PaperData,
  EvidenceItem,
} from "@/components/inspector/paper-inspector";
import type { EdgeEvidence } from "@/components/canvas/edge-evidence-popover";
import type { SemanticPath, PathMode } from "@/lib/graph-algorithms";
import type { SchoolOfThought } from "@/lib/graph-clustering";
import { FILTERS } from "@/lib/constants";
import { DEFAULT_FILTERS } from "@/components/filters/global-filters";

// =============================================================================
// TYPES
// =============================================================================

interface GraphStats {
  nodeCount: number;
  edgeCount: number;
}

export interface DialecticCounts {
  supports: number;
  contradicts: number;
  extends: number;
  cites: number;
}

interface DataRanges {
  minYear: number;
  maxYear: number;
  maxCitations: number;
}

interface FilterStats {
  hiddenNodes: number;
  hiddenEdges: number;
}

interface EdgeEvidencePosition {
  x: number;
  y: number;
}

type RelationshipFocus =
  "all" | "supports" | "contradicts" | "extends" | "cites";

export interface HydrationState {
  isHydrating: boolean;
  totalEdges: number;
  hydratedEdges: number;
  cachedCount: number;
}

export type CanvasPerspective = "battlefield" | "foundations" | "synthesis";

// =============================================================================
// STATE
// =============================================================================

interface CanvasStoreState {
  // UI Panels
  showToast: boolean;
  toastMessage: string;
  inspectorOpen: boolean;
  filtersOpen: boolean;
  shareOpen: boolean;
  saveDialogOpen: boolean;
  keyboardHelpOpen: boolean;
  pathCompareOpen: boolean;
  chatOpen: boolean;
  listPanelOpen: boolean;
  debateMatrixOpen: boolean;
  literatureReviewOpen: boolean;
  queryBuilderOpen: boolean;
  sovereignFilterActive: boolean;

  // Loading & Hydration
  isLoading: boolean;
  hydrationState: HydrationState;

  // Graph Data
  graphStats: GraphStats;
  dialecticCounts: DialecticCounts;
  dataRanges: DataRanges;
  filterStats: FilterStats;
  filters: FilterState;
  paperCount: number;
  refreshTrigger: number;
  solidNodes: Set<string>;
  visiblePapers: PaperData[];
  hoveredNode: string | null;

  // Selection
  selectionMode: boolean;
  selectedNodes: string[];
  nodeLabels: Record<string, string>;

  // Paper Inspector
  selectedPaper: PaperData | null;
  paperEvidence: EvidenceItem[];

  // Edge Evidence
  edgeEvidence: EdgeEvidence | null;
  edgeEvidencePos: EdgeEvidencePosition | null;

  // Path Comparison
  calculatedPaths: SemanticPath[];
  pathMode: PathMode;
  highlightedPath: { nodeIds: Set<string>; edgeIds: Set<string> } | null;

  // Search & Focus
  searchTarget: string | null;
  focusModeNode: string | null;
  relationshipFocus: RelationshipFocus;

  // Features
  physicsEnabled: boolean;
  tutorialActive: boolean;
  layoutMode: "force" | "temporal";

  // Topology Intelligence & Perspective
  perspective: CanvasPerspective;
  battlefieldMode: boolean;
  clusterViewMode: "papers" | "schools";
  expandedSchools: Set<string>;
  schoolsOfThought: SchoolOfThought[];
}

// =============================================================================
// ACTIONS
// =============================================================================

interface CanvasStoreActions {
  // UI
  setShowToast: (show: boolean) => void;
  setInspectorOpen: (open: boolean) => void;
  setFiltersOpen: (open: boolean) => void;
  setShareOpen: (open: boolean) => void;
  setSaveDialogOpen: (open: boolean) => void;
  setChatOpen: (open: boolean) => void;
  setKeyboardHelpOpen: (open: boolean) => void;
  setPathCompareOpen: (open: boolean) => void;
  setListPanelOpen: (open: boolean) => void;
  setDebateMatrixOpen: (open: boolean) => void;
  setLiteratureReviewOpen: (open: boolean) => void;
  setQueryBuilderOpen: (open: boolean) => void;
  toggleFilters: () => void;
  toggleChat: () => void;
  toggleSelectionMode: () => void;
  togglePhysics: () => void;
  closeAllPanels: () => void;
  showToastMessage: (message: string) => void;

  // Loading & Hydration
  setLoading: (loading: boolean) => void;
  setHydrationState: (state: Partial<HydrationState>) => void;
  resetHydrationState: () => void;

  // Graph Data
  setGraphStats: (stats: GraphStats) => void;
  setDialecticCounts: (counts: DialecticCounts) => void;
  setDataRanges: (ranges: DataRanges) => void;
  setFilterStats: (stats: FilterStats) => void;
  setFilters: (filters: FilterState) => void;
  setPaperCount: (count: number) => void;
  triggerRefresh: () => void;
  setSolidNodes: (nodes: Set<string>) => void;
  addSolidNode: (nodeId: string) => void;
  setVisiblePapers: (papers: PaperData[]) => void;
  setHoveredNode: (nodeId: string | null) => void;

  // Selection
  setSelectionMode: (mode: boolean) => void;
  setSelectedNodes: (nodes: string[]) => void;
  addSelectedNode: (nodeId: string) => void;
  removeSelectedNode: (nodeId: string) => void;
  clearSelection: () => void;
  setNodeLabels: (labels: Record<string, string>) => void;

  // Paper Inspector
  selectPaper: (paper: PaperData, evidence: EvidenceItem[]) => void;
  clearSelectedPaper: () => void;

  // Edge Evidence
  showEdgeEvidence: (
    evidence: EdgeEvidence,
    position: EdgeEvidencePosition,
  ) => void;
  clearEdgeEvidence: () => void;

  // Path Comparison
  setCalculatedPaths: (paths: SemanticPath[]) => void;
  setPathMode: (mode: PathMode) => void;
  setHighlightedPath: (
    path: { nodeIds: Set<string>; edgeIds: Set<string> } | null,
  ) => void;

  // Search & Focus
  setSearchTarget: (target: string | null) => void;
  setFocusModeNode: (nodeId: string | null) => void;
  setRelationshipFocus: (focus: RelationshipFocus) => void;

  // Features
  setPhysicsEnabled: (enabled: boolean) => void;
  setTutorialActive: (active: boolean) => void;
  setLayoutMode: (mode: "force" | "temporal") => void;

  // Topology Intelligence & Perspective
  setPerspective: (perspective: CanvasPerspective) => void;
  toggleBattlefieldMode: () => void;
  setBattlefieldMode: (enabled: boolean) => void;
  setClusterViewMode: (mode: "papers" | "schools") => void;
  toggleSchoolExpansion: (schoolId: string) => void;
  setSchoolsOfThought: (schools: SchoolOfThought[]) => void;

  // Sovereign Indexing
  setSovereignFilterActive: (active: boolean) => void;
  toggleSovereignFilter: () => void;

  // Lifecycle
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: CanvasStoreState = {
  showToast: false,
  toastMessage: "",
  inspectorOpen: false,
  filtersOpen: false,
  shareOpen: false,
  saveDialogOpen: false,
  keyboardHelpOpen: false,
  pathCompareOpen: false,
  chatOpen: false,
  listPanelOpen: false,
  debateMatrixOpen: false,
  literatureReviewOpen: false,
  queryBuilderOpen: false,
  sovereignFilterActive: false,

  isLoading: false,
  hydrationState: {
    isHydrating: false,
    totalEdges: 0,
    hydratedEdges: 0,
    cachedCount: 0,
  },

  graphStats: { nodeCount: 0, edgeCount: 0 },
  dialecticCounts: { supports: 0, contradicts: 0, extends: 0, cites: 0 },
  dataRanges: {
    minYear: FILTERS.MIN_YEAR,
    maxYear: FILTERS.MAX_YEAR,
    maxCitations: FILTERS.DEFAULT_MAX_CITATIONS,
  },
  filterStats: { hiddenNodes: 0, hiddenEdges: 0 },
  filters: DEFAULT_FILTERS,
  paperCount: 25,
  refreshTrigger: 0,
  solidNodes: new Set(),
  visiblePapers: [],
  hoveredNode: null,

  selectionMode: false,
  selectedNodes: [],
  nodeLabels: {},

  selectedPaper: null,
  paperEvidence: [],

  edgeEvidence: null,
  edgeEvidencePos: null,

  calculatedPaths: [],
  pathMode: "shortest",
  highlightedPath: null,

  searchTarget: null,
  focusModeNode: null,
  relationshipFocus: "all",

  physicsEnabled: true,
  tutorialActive: false,
  layoutMode: "force",

  perspective: "battlefield",
  battlefieldMode: true,
  clusterViewMode: "papers",
  expandedSchools: new Set(),
  schoolsOfThought: [],
};

// =============================================================================
// STORE
// =============================================================================

export const useCanvasStore = create<CanvasStoreState & CanvasStoreActions>()(
  (set, get) => ({
    ...initialState,

    // UI
    setShowToast: (show) => set({ showToast: show }),
    setInspectorOpen: (open) => set({ inspectorOpen: open }),
    setFiltersOpen: (open) => set({ filtersOpen: open }),
    setShareOpen: (open) => set({ shareOpen: open }),
    setSaveDialogOpen: (open) => set({ saveDialogOpen: open }),
    setChatOpen: (open) => set({ chatOpen: open }),
    setKeyboardHelpOpen: (open) => set({ keyboardHelpOpen: open }),
    setPathCompareOpen: (open) => set({ pathCompareOpen: open }),
    setListPanelOpen: (open) => set({ listPanelOpen: open }),
    setDebateMatrixOpen: (open) => set({ debateMatrixOpen: open }),
    setLiteratureReviewOpen: (open) => set({ literatureReviewOpen: open }),
    setQueryBuilderOpen: (open) => set({ queryBuilderOpen: open }),
    toggleFilters: () => set((s) => ({ filtersOpen: !s.filtersOpen })),
    toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
    toggleSelectionMode: () =>
      set((s) => ({ selectionMode: !s.selectionMode })),
    togglePhysics: () => set((s) => ({ physicsEnabled: !s.physicsEnabled })),
    closeAllPanels: () =>
      set({
        inspectorOpen: false,
        filtersOpen: false,
        shareOpen: false,
        saveDialogOpen: false,
        chatOpen: false,
        pathCompareOpen: false,
        listPanelOpen: false,
        debateMatrixOpen: false,
        literatureReviewOpen: false,
        queryBuilderOpen: false,
        edgeEvidence: null,
        edgeEvidencePos: null,
        focusModeNode: null,
        selectedNodes: [],
        selectionMode: false,
        highlightedPath: null,
        calculatedPaths: [],
      }),
    showToastMessage: (message) =>
      set({ toastMessage: message, showToast: true }),

    // Loading & Hydration
    setLoading: (loading) => set({ isLoading: loading }),
    setHydrationState: (state) =>
      set((s) => ({
        hydrationState: { ...s.hydrationState, ...state },
      })),
    resetHydrationState: () =>
      set({
        hydrationState: {
          isHydrating: false,
          totalEdges: 0,
          hydratedEdges: 0,
          cachedCount: 0,
        },
      }),

    // Graph Data
    setGraphStats: (stats) => set({ graphStats: stats }),
    setDialecticCounts: (counts) => set({ dialecticCounts: counts }),
    setDataRanges: (ranges) =>
      set((state) => {
        const isDefaultYear =
          state.filters.yearRange[0] <= FILTERS.MIN_YEAR &&
          state.filters.yearRange[1] >= FILTERS.MAX_YEAR;
        const isDefaultCitation =
          state.filters.citationRange[0] === FILTERS.MIN_CITATIONS &&
          state.filters.citationRange[1] <= FILTERS.DEFAULT_MAX_CITATIONS;

        const nextYearRange: [number, number] = isDefaultYear
          ? [ranges.minYear, ranges.maxYear]
          : [
              Math.max(
                ranges.minYear,
                Math.min(ranges.maxYear, state.filters.yearRange[0]),
              ),
              Math.min(
                ranges.maxYear,
                Math.max(ranges.minYear, state.filters.yearRange[1]),
              ),
            ];

        const nextCitationRange: [number, number] = isDefaultCitation
          ? [FILTERS.MIN_CITATIONS, ranges.maxCitations]
          : [
              Math.max(
                FILTERS.MIN_CITATIONS,
                Math.min(ranges.maxCitations, state.filters.citationRange[0]),
              ),
              Math.min(
                ranges.maxCitations,
                Math.max(FILTERS.MIN_CITATIONS, state.filters.citationRange[1]),
              ),
            ];

        return {
          dataRanges: ranges,
          filters: {
            ...state.filters,
            yearRange: nextYearRange,
            citationRange: nextCitationRange,
          },
        };
      }),
    setFilterStats: (stats) => set({ filterStats: stats }),
    setFilters: (filters) => set({ filters }),
    setPaperCount: (count) => set({ paperCount: count }),
    triggerRefresh: () =>
      set((s) => ({ refreshTrigger: s.refreshTrigger + 1 })),
    setSolidNodes: (nodes) => set({ solidNodes: nodes }),
    addSolidNode: (nodeId) => {
      const next = new Set(get().solidNodes);
      next.add(nodeId);
      set({ solidNodes: next });
    },
    setVisiblePapers: (papers) => set({ visiblePapers: papers }),
    setHoveredNode: (nodeId) => set({ hoveredNode: nodeId }),

    // Selection
    setSelectionMode: (mode) => set({ selectionMode: mode }),
    setSelectedNodes: (nodes) => set({ selectedNodes: nodes }),
    addSelectedNode: (nodeId) => {
      const { selectedNodes } = get();
      if (!selectedNodes.includes(nodeId)) {
        set({ selectedNodes: [...selectedNodes, nodeId] });
      }
    },
    removeSelectedNode: (nodeId) =>
      set((s) => ({
        selectedNodes: s.selectedNodes.filter((id) => id !== nodeId),
      })),
    clearSelection: () =>
      set({
        selectedNodes: [],
        selectionMode: false,
        highlightedPath: null,
        calculatedPaths: [],
        pathCompareOpen: false,
      }),
    setNodeLabels: (labels) => set({ nodeLabels: labels }),

    // Paper Inspector
    selectPaper: (paper, evidence) =>
      set({
        selectedPaper: paper,
        paperEvidence: evidence,
        inspectorOpen: true,
      }),
    clearSelectedPaper: () =>
      set({ selectedPaper: null, paperEvidence: [], inspectorOpen: false }),

    // Edge Evidence
    showEdgeEvidence: (evidence, position) =>
      set({ edgeEvidence: evidence, edgeEvidencePos: position }),
    clearEdgeEvidence: () => set({ edgeEvidence: null, edgeEvidencePos: null }),

    // Path Comparison
    setCalculatedPaths: (paths) => set({ calculatedPaths: paths }),
    setPathMode: (mode) => set({ pathMode: mode }),
    setHighlightedPath: (path) => set({ highlightedPath: path }),

    // Search & Focus
    setSearchTarget: (target) => set({ searchTarget: target }),
    setFocusModeNode: (nodeId) => set({ focusModeNode: nodeId }),
    setRelationshipFocus: (focus) => set({ relationshipFocus: focus }),

    // Features
    setPhysicsEnabled: (enabled) => set({ physicsEnabled: enabled }),
    setTutorialActive: (active) => set({ tutorialActive: active }),
    setLayoutMode: (mode) =>
      set({
        layoutMode: mode,
        physicsEnabled: mode === "force",
      }),

    // Topology Intelligence & Perspective
    setPerspective: (perspective) =>
      set({
        perspective,
        battlefieldMode: perspective === "battlefield",
      }),
    toggleBattlefieldMode: () =>
      set((s) => {
        const next =
          s.perspective === "battlefield" ? "synthesis" : "battlefield";
        return {
          perspective: next,
          battlefieldMode: next === "battlefield",
        };
      }),
    setBattlefieldMode: (enabled) =>
      set({
        battlefieldMode: enabled,
        perspective: enabled ? "battlefield" : "synthesis",
      }),
    setClusterViewMode: (mode) => set({ clusterViewMode: mode }),
    toggleSchoolExpansion: (schoolId) => {
      const next = new Set(get().expandedSchools);
      if (next.has(schoolId)) {
        next.delete(schoolId);
      } else {
        next.add(schoolId);
      }
      set({ expandedSchools: next });
    },
    setSchoolsOfThought: (schools) => set({ schoolsOfThought: schools }),

    // Sovereign Indexing
    setSovereignFilterActive: (active) =>
      set({ sovereignFilterActive: active }),
    toggleSovereignFilter: () =>
      set((s) => ({ sovereignFilterActive: !s.sovereignFilterActive })),

    // Lifecycle
    reset: () => set(initialState),
  }),
);
