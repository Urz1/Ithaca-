import { useState, useCallback, useEffect } from "react";
import Graph from "graphology";

const STORAGE_KEY = "ithaca_graph_session_v1";

interface SerializedGraph {
  nodes: any[];
  edges: any[];
  timestamp: number;
}

export function useGraphSession(graph: Graph | null) {
  const [isRestored, setIsRestored] = useState(false);

  // Save mechanism
  const saveGraph = useCallback(() => {
    if (!graph || graph.order === 0) return;

    const serialized: SerializedGraph = {
      nodes: graph.mapNodes((id, attr) => ({ id, ...attr })),
      edges: graph.mapEdges((id, attr, source, target) => ({
        id,
        source,
        target,
        ...attr,
      })),
      timestamp: Date.now(),
    };

    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
      // console.log("Graph saved to session", serialized.nodes.length);
    } catch (e) {
      console.warn("Failed to save graph session (quota exceeded?)", e);
    }
  }, [graph]);

  // Auto-save when graph changes
  useEffect(() => {
    if (!graph) return;

    let timeout: NodeJS.Timeout;

    const triggerSave = () => {
      clearTimeout(timeout);
      timeout = setTimeout(saveGraph, 2000); // Debounce 2s
    };

    // Listen to structural changes
    graph.on("nodeAdded", triggerSave);
    graph.on("edgeAdded", triggerSave);
    graph.on("nodeDropped", triggerSave);
    graph.on("edgeDropped", triggerSave);
    graph.on("cleared", triggerSave);

    // We skip attributesUpdated to avoid saving on every hover/animation
    // But we might miss status updates (Solid vs Ghost).
    // Compromise: Save on attributesUpdated but with longer debounce?
    // Or assume major state changes involve structural changes (Add to Project = solid attribute? No).
    // Let's add attributesUpdated but carefully.
    graph.on("attributesUpdated", triggerSave);

    return () => {
      clearTimeout(timeout);
      graph.off("nodeAdded", triggerSave);
      graph.off("edgeAdded", triggerSave);
      graph.off("nodeDropped", triggerSave);
      graph.off("edgeDropped", triggerSave);
      graph.off("cleared", triggerSave);
      graph.off("attributesUpdated", triggerSave);
    };
  }, [graph, saveGraph]);

  const loadGraph = useCallback((): SerializedGraph | null => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      return JSON.parse(stored) as SerializedGraph;
    } catch (e) {
      console.error("Failed to parse graph session", e);
      return null;
    }
  }, []);

  const clearSession = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return { saveGraph, loadGraph, clearSession };
}
