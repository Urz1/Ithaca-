import { describe, expect, it, beforeEach } from "vitest";
import { useCanvasStore } from "@/stores/canvas-store";

describe("useCanvasStore — Hydration State Management", () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
  });

  it("initializes with default non-hydrating state", () => {
    const { hydrationState, isLoading } = useCanvasStore.getState();
    expect(isLoading).toBe(false);
    expect(hydrationState).toEqual({
      isHydrating: false,
      totalEdges: 0,
      hydratedEdges: 0,
      cachedCount: 0,
    });
  });

  it("updates hydration progress partially and preserves untouched fields", () => {
    const { setHydrationState } = useCanvasStore.getState();

    // Start hydration
    setHydrationState({
      isHydrating: true,
      totalEdges: 30,
      hydratedEdges: 0,
      cachedCount: 5,
    });

    let state = useCanvasStore.getState().hydrationState;
    expect(state.isHydrating).toBe(true);
    expect(state.totalEdges).toBe(30);
    expect(state.hydratedEdges).toBe(0);
    expect(state.cachedCount).toBe(5);

    // Stream chunk 1: 10 edges hydrated
    setHydrationState({ hydratedEdges: 10 });
    state = useCanvasStore.getState().hydrationState;
    expect(state.hydratedEdges).toBe(10);
    expect(state.totalEdges).toBe(30); // preserved
    expect(state.cachedCount).toBe(5); // preserved
    expect(state.isHydrating).toBe(true); // preserved

    // Stream chunk 2: complete
    setHydrationState({ hydratedEdges: 30, isHydrating: false });
    state = useCanvasStore.getState().hydrationState;
    expect(state.hydratedEdges).toBe(30);
    expect(state.isHydrating).toBe(false);
  });

  it("resets hydration state cleanly", () => {
    const { setHydrationState, resetHydrationState } =
      useCanvasStore.getState();

    setHydrationState({
      isHydrating: true,
      totalEdges: 50,
      hydratedEdges: 25,
      cachedCount: 12,
    });

    resetHydrationState();
    const state = useCanvasStore.getState().hydrationState;
    expect(state).toEqual({
      isHydrating: false,
      totalEdges: 0,
      hydratedEdges: 0,
      cachedCount: 0,
    });
  });

  it("resets hydration state when global reset is called", () => {
    const { setHydrationState, reset } = useCanvasStore.getState();

    setHydrationState({
      isHydrating: true,
      totalEdges: 20,
      hydratedEdges: 10,
    });

    reset();
    const state = useCanvasStore.getState().hydrationState;
    expect(state.isHydrating).toBe(false);
    expect(state.totalEdges).toBe(0);
  });
});

describe("useCanvasStore — Topology Intelligence & Battlefield Mode", () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
  });

  it("initializes with perspective 'battlefield', battlefieldMode true and clusterViewMode 'papers'", () => {
    const {
      perspective,
      battlefieldMode,
      clusterViewMode,
      expandedSchools,
      schoolsOfThought,
    } = useCanvasStore.getState();
    expect(perspective).toBe("battlefield");
    expect(battlefieldMode).toBe(true);
    expect(clusterViewMode).toBe("papers");
    expect(expandedSchools.size).toBe(0);
    expect(schoolsOfThought).toHaveLength(0);
  });

  it("toggles and sets battlefieldMode and perspectives cleanly", () => {
    const { toggleBattlefieldMode, setBattlefieldMode, setPerspective } =
      useCanvasStore.getState();

    // Starts in battlefield (true) -> toggles to synthesis (false)
    toggleBattlefieldMode();
    expect(useCanvasStore.getState().battlefieldMode).toBe(false);
    expect(useCanvasStore.getState().perspective).toBe("synthesis");

    // Toggles back to battlefield (true)
    toggleBattlefieldMode();
    expect(useCanvasStore.getState().battlefieldMode).toBe(true);
    expect(useCanvasStore.getState().perspective).toBe("battlefield");

    setBattlefieldMode(false);
    expect(useCanvasStore.getState().battlefieldMode).toBe(false);
    expect(useCanvasStore.getState().perspective).toBe("synthesis");

    setPerspective("foundations");
    expect(useCanvasStore.getState().perspective).toBe("foundations");
    expect(useCanvasStore.getState().battlefieldMode).toBe(false);

    setPerspective("battlefield");
    expect(useCanvasStore.getState().perspective).toBe("battlefield");
    expect(useCanvasStore.getState().battlefieldMode).toBe(true);
  });

  it("switches clusterViewMode and handles school expansion toggles", () => {
    const { setClusterViewMode, toggleSchoolExpansion, setSchoolsOfThought } =
      useCanvasStore.getState();

    setClusterViewMode("schools");
    expect(useCanvasStore.getState().clusterViewMode).toBe("schools");

    toggleSchoolExpansion("school-1");
    expect(useCanvasStore.getState().expandedSchools.has("school-1")).toBe(
      true,
    );

    toggleSchoolExpansion("school-1");
    expect(useCanvasStore.getState().expandedSchools.has("school-1")).toBe(
      false,
    );

    const mockSchools = [
      {
        id: "school-0",
        label: "Attention Mechanisms",
        color: "#6366f1",
        papers: [],
        paperCount: 5,
        disputeCount: 2,
        supportsCount: 3,
        centroid: { x: 0, y: 0 },
        isExpanded: false,
      },
    ];

    setSchoolsOfThought(mockSchools);
    expect(useCanvasStore.getState().schoolsOfThought).toEqual(mockSchools);
  });

  it("manages debateMatrixOpen and literatureReviewOpen dialog states", () => {
    const { setDebateMatrixOpen, setLiteratureReviewOpen, closeAllPanels } =
      useCanvasStore.getState();

    expect(useCanvasStore.getState().debateMatrixOpen).toBe(false);
    expect(useCanvasStore.getState().literatureReviewOpen).toBe(false);

    setDebateMatrixOpen(true);
    expect(useCanvasStore.getState().debateMatrixOpen).toBe(true);

    setLiteratureReviewOpen(true);
    expect(useCanvasStore.getState().literatureReviewOpen).toBe(true);

    closeAllPanels();
    expect(useCanvasStore.getState().debateMatrixOpen).toBe(false);
    expect(useCanvasStore.getState().literatureReviewOpen).toBe(false);
  });

  it("manages sovereignFilterActive state", () => {
    const { setSovereignFilterActive, toggleSovereignFilter, reset } =
      useCanvasStore.getState();

    expect(useCanvasStore.getState().sovereignFilterActive).toBe(false);

    setSovereignFilterActive(true);
    expect(useCanvasStore.getState().sovereignFilterActive).toBe(true);

    toggleSovereignFilter();
    expect(useCanvasStore.getState().sovereignFilterActive).toBe(false);

    toggleSovereignFilter();
    expect(useCanvasStore.getState().sovereignFilterActive).toBe(true);

    reset();
    expect(useCanvasStore.getState().sovereignFilterActive).toBe(false);
  });
});
