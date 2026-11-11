import { describe, expect, it } from "vitest";
import Graph from "graphology";
import {
  applyHemisphericLayout,
  applyBattlefieldLayout,
} from "./perspective-layout";

describe("perspective-layout", () => {
  it("separates upstream roots to the West (X < 0) and downstream debaters to the East (X > 0)", () => {
    const graph = new Graph();
    // Anchor
    graph.addNode("bem2011", {
      title: "Feeling the Future",
      year: 2011,
      size: 25,
      lineageRole: "anchor",
    });
    // Upstream references
    graph.addNode("maher1964", {
      title: "Clinical Psychology",
      year: 1964,
      size: 10,
      lineageRole: "upstream",
    });
    graph.addNode("bell1964", {
      title: "Bell Theorem",
      year: 1964,
      size: 10,
      lineageRole: "upstream",
    });
    // Downstream debaters
    graph.addNode("wagenmakers2011", {
      title: "Why Psychologists Must Change",
      year: 2011,
      size: 12,
      lineageRole: "downstream",
      refutes: 1,
    });
    graph.addNode("snodgrass2011", {
      title: "Supporting Psi",
      year: 2011,
      size: 10,
      lineageRole: "downstream",
      supports: 1,
    });

    graph.addEdge("wagenmakers2011", "bem2011", { edgeType: "contradicts" });
    graph.addEdge("snodgrass2011", "bem2011", { edgeType: "supports" });
    graph.addEdge("bem2011", "maher1964", { edgeType: "cites" });

    const result = applyHemisphericLayout(graph, { anchorId: "bem2011" });
    expect(result.placed).toBe(5);
    expect(result.upstreamCount).toBe(2);
    expect(result.downstreamCount).toBe(2);

    // Anchor is centered
    expect(graph.getNodeAttribute("bem2011", "x")).toBe(0);
    expect(graph.getNodeAttribute("bem2011", "y")).toBe(0);

    // Upstream are West (X < 0)
    expect(graph.getNodeAttribute("maher1964", "x")).toBeLessThan(0);
    expect(graph.getNodeAttribute("bell1964", "x")).toBeLessThan(0);

    // Downstream are East (X > 0)
    expect(graph.getNodeAttribute("wagenmakers2011", "x")).toBeGreaterThan(0);
    expect(graph.getNodeAttribute("snodgrass2011", "x")).toBeGreaterThan(0);
  });

  it("applies battlefield layout centering anchor and clustering debaters", () => {
    const graph = new Graph();
    graph.addNode("anchor", { title: "Target", lineageRole: "anchor" });
    graph.addNode("critic", {
      title: "Critic",
      lineageRole: "downstream",
      refutes: 1,
    });
    graph.addEdge("critic", "anchor", { edgeType: "contradicts" });

    const result = applyBattlefieldLayout(graph, { anchorId: "anchor" });
    expect(result.placed).toBe(2);
    expect(graph.getNodeAttribute("anchor", "x")).toBe(0);
    expect(graph.getNodeAttribute("anchor", "y")).toBe(0);
    // Critic has been placed at non-zero coordinates
    expect(graph.getNodeAttribute("critic", "x")).toBeDefined();
    expect(graph.getNodeAttribute("critic", "y")).toBeDefined();
  });
});
