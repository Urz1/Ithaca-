import { describe, it, expect } from "vitest";
import Graph from "graphology";
import { graphAPI } from "@/lib/api/graph-api";
import { type FilterState } from "@/components/filters/global-filters";

describe("graphAPI.applyFilters", () => {
  const baseFilters: FilterState = {
    relationships: {
      supports: true,
      contradicts: true,
      extends: true,
      cites: true,
    },
    citationRange: [0, 1000],
    yearRange: [2000, 2025],
  };

  it("filters edges by relationship types", () => {
    const graph = new Graph({ type: "directed" });
    graph.addNode("A", { citations: 100, year: 2020 });
    graph.addNode("B", { citations: 200, year: 2021 });
    graph.addNode("C", { citations: 50, year: 2018 });

    graph.addEdgeWithKey("e1", "A", "B", { edgeType: "supports" });
    graph.addEdgeWithKey("e2", "C", "A", { edgeType: "contradicts" });
    graph.addEdgeWithKey("e3", "B", "C", { edgeType: "cites" });

    // Turn off contradicts
    const filtersNoContradicts: FilterState = {
      ...baseFilters,
      relationships: {
        ...baseFilters.relationships,
        contradicts: false,
      },
    };

    const { hiddenNodes, hiddenEdges } = graphAPI.applyFilters(
      graph,
      filtersNoContradicts,
    );
    expect(hiddenNodes.size).toBe(0);
    expect(hiddenEdges.has("e2")).toBe(true);
    expect(hiddenEdges.has("e1")).toBe(false);
    expect(hiddenEdges.has("e3")).toBe(false);
  });

  it("hides incident edges when a connected node is filtered out by citation or year range", () => {
    const graph = new Graph({ type: "directed" });
    graph.addNode("A", { citations: 500, year: 2020 });
    graph.addNode("B", { citations: 10, year: 2021 }); // Low citations
    graph.addNode("C", { citations: 300, year: 1995 }); // Old year

    graph.addEdgeWithKey("e1", "A", "B", { edgeType: "supports" });
    graph.addEdgeWithKey("e2", "A", "C", { edgeType: "extends" });

    // Require min 50 citations and year >= 2000
    const filters: FilterState = {
      ...baseFilters,
      citationRange: [50, 1000],
      yearRange: [2000, 2025],
    };

    const { hiddenNodes, hiddenEdges } = graphAPI.applyFilters(graph, filters);

    // B is filtered out due to citations < 50
    // C is filtered out due to year < 2000
    expect(hiddenNodes.has("B")).toBe(true);
    expect(hiddenNodes.has("C")).toBe(true);
    expect(hiddenNodes.has("A")).toBe(false);

    // Both e1 and e2 should be hidden because their target nodes are hidden
    expect(hiddenEdges.has("e1")).toBe(true);
    expect(hiddenEdges.has("e2")).toBe(true);
  });
});
