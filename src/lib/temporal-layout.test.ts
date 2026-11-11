import { describe, expect, it } from "vitest";
import Graph from "graphology";
import { applyTemporalLayout, restoreForceLayout } from "./temporal-layout";

describe("temporal layout", () => {
  it("places later papers further to the right and can restore force positions", () => {
    const graph = new Graph();
    graph.addNode("old", { title: "Old", year: 2000, x: 10, y: 20 });
    graph.addNode("new", { title: "New", year: 2020, x: 30, y: 40 });

    const result = applyTemporalLayout(graph, { width: 1000 });
    expect(result.placed).toBe(2);
    expect(graph.getNodeAttribute("old", "x")).toBeLessThan(
      graph.getNodeAttribute("new", "x"),
    );

    restoreForceLayout(graph);
    expect(graph.getNodeAttribute("old", "x")).toBe(10);
    expect(graph.getNodeAttribute("old", "y")).toBe(20);
  });

  it("returns zero placements when no nodes have valid years", () => {
    const graph = new Graph();
    graph.addNode("missing-year", { title: "No year", x: 5, y: 10 });

    const result = applyTemporalLayout(graph, { width: 800 });
    expect(result.placed).toBe(0);
    expect(restoreForceLayout(graph)).toBe(0);
  });

  it("handles a single publication year and skips hidden nodes", () => {
    const graph = new Graph();
    graph.addNode("solo", { title: "Solo", year: 2015, x: 12, y: 18 });
    graph.addNode("hidden", {
      title: "Hidden",
      year: 2018,
      x: 40,
      y: 40,
      hidden: true,
    });

    const result = applyTemporalLayout(graph, { width: 600 });
    expect(result.placed).toBe(1);
    expect(graph.getNodeAttribute("solo", "forceX")).toBe(12);
    expect(graph.getNodeAttribute("solo", "forceY")).toBe(18);

    expect(restoreForceLayout(graph)).toBe(1);
    expect(graph.getNodeAttribute("solo", "x")).toBe(12);
    expect(graph.getNodeAttribute("solo", "y")).toBe(18);
  });
});
