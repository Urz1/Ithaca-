import { beforeEach, describe, expect, it } from "vitest";
import Graph from "graphology";
import { useCanvasStore } from "@/stores/canvas-store";
import {
  GRAPH_SNAPSHOT_KIND,
  GRAPH_SNAPSHOT_VERSION,
  isGraphSnapshotPayload,
  resolveExploreEntryTarget,
  serializeGraphSnapshot,
  type GraphSnapshotPayload,
} from "@/lib/graph-snapshot";

// =============================================================================
// TRANSACTIONAL UNDO/REDO ENGINE (Bounded 50-step Canvas Command History)
// =============================================================================

export interface CanvasPosition {
  x: number;
  y: number;
}

export interface CanvasCamera {
  x: number;
  y: number;
  ratio: number;
  angle: number;
}

export interface CanvasGraphState {
  nodePositions: Record<string, CanvasPosition>;
  pinnedNodes: Set<string>;
  camera: CanvasCamera;
}

export interface CanvasTransaction {
  id: string;
  description: string;
  before: CanvasGraphState;
  after: CanvasGraphState;
}

export class CanvasTransactionManager {
  private undoStack: CanvasTransaction[] = [];
  private redoStack: CanvasTransaction[] = [];
  private readonly maxHistory: number;

  constructor(maxHistory = 50) {
    this.maxHistory = maxHistory;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get historyLength(): number {
    return this.undoStack.length;
  }

  get redoLength(): number {
    return this.redoStack.length;
  }

  execute(
    description: string,
    currentState: CanvasGraphState,
    nextState: CanvasGraphState,
  ): CanvasGraphState {
    const tx: CanvasTransaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      description,
      before: {
        nodePositions: { ...currentState.nodePositions },
        pinnedNodes: new Set(currentState.pinnedNodes),
        camera: { ...currentState.camera },
      },
      after: {
        nodePositions: { ...nextState.nodePositions },
        pinnedNodes: new Set(nextState.pinnedNodes),
        camera: { ...nextState.camera },
      },
    };

    this.undoStack.push(tx);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift(); // Evict oldest beyond capacity
    }

    // Branching clears redo history
    this.redoStack = [];
    return nextState;
  }

  undo(_currentState?: CanvasGraphState): CanvasGraphState | null {
    const tx = this.undoStack.pop();
    if (!tx) return null;

    this.redoStack.push(tx);
    return {
      nodePositions: { ...tx.before.nodePositions },
      pinnedNodes: new Set(tx.before.pinnedNodes),
      camera: { ...tx.before.camera },
    };
  }

  redo(_currentState?: CanvasGraphState): CanvasGraphState | null {
    const tx = this.redoStack.pop();
    if (!tx) return null;

    this.undoStack.push(tx);
    return {
      nodePositions: { ...tx.after.nodePositions },
      pinnedNodes: new Set(tx.after.pinnedNodes),
      camera: { ...tx.after.camera },
    };
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}

// Bounding box validator for interactive canvas
export function clampCoordinates(
  pos: CanvasPosition,
  bounds = { minX: -2000, maxX: 2000, minY: -2000, maxY: 2000 },
): CanvasPosition {
  return {
    x: Math.max(bounds.minX, Math.min(bounds.maxX, pos.x)),
    y: Math.max(bounds.minY, Math.min(bounds.maxY, pos.y)),
  };
}

// =============================================================================
// TEST SUITE
// =============================================================================

describe("Phase 2: Canvas Store State Machine & Transactional Undo/Redo", () => {
  beforeEach(() => {
    useCanvasStore.getState().reset();
  });

  describe("Zustand Canvas Store State Transitions", () => {
    it("handles multi-panel visibility and atomic closeAllPanels cleanup", () => {
      const store = useCanvasStore.getState();

      store.setFiltersOpen(true);
      store.setInspectorOpen(true);
      store.setChatOpen(true);
      store.setPathCompareOpen(true);
      store.setDebateMatrixOpen(true);
      store.addSelectedNode("node_1");
      store.setSelectionMode(true);

      expect(useCanvasStore.getState().filtersOpen).toBe(true);
      expect(useCanvasStore.getState().inspectorOpen).toBe(true);
      expect(useCanvasStore.getState().selectedNodes).toHaveLength(1);

      // Close all panels atomically resets UI dialogs and selections
      useCanvasStore.getState().closeAllPanels();

      const after = useCanvasStore.getState();
      expect(after.filtersOpen).toBe(false);
      expect(after.inspectorOpen).toBe(false);
      expect(after.chatOpen).toBe(false);
      expect(after.pathCompareOpen).toBe(false);
      expect(after.debateMatrixOpen).toBe(false);
      expect(after.selectedNodes).toHaveLength(0);
      expect(after.selectionMode).toBe(false);
    });

    it("manages node selection set idempotently without duplicates", () => {
      const store = useCanvasStore.getState();

      store.addSelectedNode("paper_alpha");
      store.addSelectedNode("paper_beta");
      store.addSelectedNode("paper_alpha"); // duplicate attempt

      expect(useCanvasStore.getState().selectedNodes).toEqual([
        "paper_alpha",
        "paper_beta",
      ]);

      store.removeSelectedNode("paper_alpha");
      expect(useCanvasStore.getState().selectedNodes).toEqual(["paper_beta"]);

      store.clearSelection();
      expect(useCanvasStore.getState().selectedNodes).toEqual([]);
      expect(useCanvasStore.getState().selectionMode).toBe(false);
    });

    it("toggles schools of thought expansion and switches cluster views", () => {
      const store = useCanvasStore.getState();

      expect(store.clusterViewMode).toBe("papers");
      store.setClusterViewMode("schools");
      expect(useCanvasStore.getState().clusterViewMode).toBe("schools");

      store.toggleSchoolExpansion("school_nlp");
      expect(useCanvasStore.getState().expandedSchools.has("school_nlp")).toBe(
        true,
      );

      store.toggleSchoolExpansion("school_nlp");
      expect(useCanvasStore.getState().expandedSchools.has("school_nlp")).toBe(
        false,
      );

      // Starts in battlefield (true) -> toggles to synthesis (false) -> back to battlefield (true)
      store.toggleBattlefieldMode();
      expect(useCanvasStore.getState().battlefieldMode).toBe(false);
      store.toggleBattlefieldMode();
      expect(useCanvasStore.getState().battlefieldMode).toBe(true);
    });

    it("resets whole state to pristine baseline on reset()", () => {
      const store = useCanvasStore.getState();
      store.setPaperCount(100);
      store.setSovereignFilterActive(true);
      store.addSolidNode("fixed_center");
      store.setHoveredNode("hover_test");

      store.reset();

      const state = useCanvasStore.getState();
      expect(state.paperCount).toBe(25);
      expect(state.sovereignFilterActive).toBe(false);
      expect(state.solidNodes.size).toBe(0);
      expect(state.hoveredNode).toBeNull();
    });
  });

  describe("Graph Snapshot Serialization & Deserialization", () => {
    it("serializes Graphology instances into versioned snapshot payload", () => {
      const graph = new Graph();
      graph.addNode("W1", {
        label: "Paper 1",
        year: 2024,
        hidden: false,
        x: 10,
        y: 20,
      });
      graph.addNode("W2", {
        label: "Paper 2",
        year: 2025,
        hidden: false,
        x: -50,
        y: 80,
      });
      graph.addNode("W_HIDDEN", { label: "Ghost", hidden: true }); // should be skipped
      graph.addEdge("W1", "W2", { edgeType: "contradicts", confidence: 0.95 });

      const snapshot = serializeGraphSnapshot(graph, "query-deep-learning");

      expect(snapshot.kind).toBe(GRAPH_SNAPSHOT_KIND);
      expect(snapshot.version).toBe(GRAPH_SNAPSHOT_VERSION);
      expect(snapshot.query).toBe("query-deep-learning");
      expect(snapshot.nodes).toHaveLength(2);
      expect(snapshot.edges).toHaveLength(1);
      expect(snapshot.nodes.find((n) => n.id === "W_HIDDEN")).toBeUndefined();
      expect(isGraphSnapshotPayload(snapshot)).toBe(true);
    });

    it("correctly identifies valid vs malformed snapshot payloads", () => {
      expect(isGraphSnapshotPayload(null)).toBe(false);
      expect(isGraphSnapshotPayload({})).toBe(false);
      expect(isGraphSnapshotPayload({ kind: "wrong", version: 1 })).toBe(false);

      const valid: GraphSnapshotPayload = {
        kind: GRAPH_SNAPSHOT_KIND,
        version: GRAPH_SNAPSHOT_VERSION,
        nodes: [{ id: "n1" }],
        edges: [],
        capturedAt: new Date().toISOString(),
      };
      expect(isGraphSnapshotPayload(valid)).toBe(true);
    });

    it("resolves user entry targets into proper semantic search keys", () => {
      expect(resolveExploreEntryTarget("W987654321")).toBe("W987654321");
      expect(
        resolveExploreEntryTarget("https://doi.org/10.1145/3375395.3387640"),
      ).toBe("10.1145/3375395.3387640");
      expect(
        resolveExploreEntryTarget("Why do language models hallucinate?"),
      ).toBe("question-Why do language models hallucinate");
      expect(resolveExploreEntryTarget("quantum computing")).toBe(
        "topic-quantum computing",
      );
    });
  });

  describe("50-Step Transaction History & Undo/Redo Engine", () => {
    it("records 50 consecutive node operations and enforces the 50-step capacity limit", () => {
      const manager = new CanvasTransactionManager(50);
      let currentState: CanvasGraphState = {
        nodePositions: { node_1: { x: 0, y: 0 } },
        pinnedNodes: new Set(),
        camera: { x: 0, y: 0, ratio: 1, angle: 0 },
      };

      // Perform 55 sequential move actions
      for (let i = 1; i <= 55; i++) {
        const nextState: CanvasGraphState = {
          nodePositions: {
            node_1: { x: i * 10, y: i * 5 },
          },
          pinnedNodes: new Set(currentState.pinnedNodes),
          camera: { ...currentState.camera },
        };
        currentState = manager.execute(
          `Move node_1 to step ${i}`,
          currentState,
          nextState,
        );
      }

      // History should be capped at 50, evicting the first 5 steps
      expect(manager.historyLength).toBe(50);
      expect(manager.canUndo).toBe(true);
      expect(manager.canRedo).toBe(false);
      expect(currentState.nodePositions["node_1"]).toEqual({ x: 550, y: 275 });

      // Roll back 10 steps
      for (let step = 0; step < 10; step++) {
        currentState = manager.undo(currentState)!;
      }

      expect(manager.historyLength).toBe(40);
      expect(manager.redoLength).toBe(10);
      expect(currentState.nodePositions["node_1"]).toEqual({ x: 450, y: 225 });

      // Redo 5 steps
      for (let step = 0; step < 5; step++) {
        currentState = manager.redo(currentState)!;
      }

      expect(manager.historyLength).toBe(45);
      expect(manager.redoLength).toBe(5);
      expect(currentState.nodePositions["node_1"]).toEqual({ x: 500, y: 250 });
    });

    it("clears redo stack upon new branching action after an undo", () => {
      const manager = new CanvasTransactionManager(50);
      let state: CanvasGraphState = {
        nodePositions: { n: { x: 10, y: 10 } },
        pinnedNodes: new Set(),
        camera: { x: 0, y: 0, ratio: 1, angle: 0 },
      };

      state = manager.execute("Move 1", state, {
        ...state,
        nodePositions: { n: { x: 20, y: 20 } },
      });
      state = manager.execute("Move 2", state, {
        ...state,
        nodePositions: { n: { x: 30, y: 30 } },
      });

      // Undo Move 2
      state = manager.undo(state)!;
      expect(manager.canRedo).toBe(true);
      expect(state.nodePositions["n"]).toEqual({ x: 20, y: 20 });

      // Perform a branched action instead of redo
      state = manager.execute("Branch Move", state, {
        ...state,
        nodePositions: { n: { x: 99, y: 99 } },
      });

      // Redo stack must be purged
      expect(manager.canRedo).toBe(false);
      expect(manager.redoLength).toBe(0);
      expect(state.nodePositions["n"]).toEqual({ x: 99, y: 99 });
    });

    it("clamps dragged coordinates within the canvas bounding box [-2000, 2000]", () => {
      const outOfBoundsHigh = { x: 2500, y: 3000 };
      const outOfBoundsLow = { x: -3500, y: -2100 };
      const insideBounds = { x: 450, y: -800 };

      expect(clampCoordinates(outOfBoundsHigh)).toEqual({ x: 2000, y: 2000 });
      expect(clampCoordinates(outOfBoundsLow)).toEqual({ x: -2000, y: -2000 });
      expect(clampCoordinates(insideBounds)).toEqual({ x: 450, y: -800 });
    });
  });
});
