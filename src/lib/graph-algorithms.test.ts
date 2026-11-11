import Graph from "graphology";
import { describe, expect, it, vi } from "vitest";
import { findSemanticPath } from "./graph-algorithms";

vi.mock("./debug", () => ({
  debug: {
    graph: vi.fn(),
    warn: vi.fn(),
  },
}));

function createGraph() {
  const graph = new Graph({ type: "undirected" });
  graph.addNode("a", { title: "Alpha", year: 2020, authors: "A. Author" });
  graph.addNode("b", { title: "Beta", year: 2021, authors: "B. Author" });
  graph.addNode("c", { title: "Gamma", year: 2022, authors: "C. Author" });
  graph.addEdge("a", "b", { edgeType: "supports", confidence: 0.9 });
  graph.addEdge("b", "c", { edgeType: "contradicts", confidence: 0.8 });
  graph.addEdge("a", "c", { edgeType: "cites", confidence: 0.7 });
  return graph;
}

describe("findSemanticPath", () => {
  it("returns no path when either endpoint is missing", () => {
    expect(findSemanticPath(createGraph(), "missing", "c", "shortest")).toEqual(
      [],
    );
  });

  it("chooses the direct edge for shortest mode", () => {
    const [path] = findSemanticPath(createGraph(), "a", "c", "shortest");

    expect(path.name).toBe("Shortest Path");
    expect(path.nodes.map((node) => node.id)).toEqual(["a", "c"]);
    expect(path.edges).toEqual([{ type: "cites", confidence: 0.7 }]);
  });

  it("prioritizes a contradiction in conflict mode", () => {
    const graph = createGraph();
    graph.dropEdge(graph.edge("a", "c"));
    const [path] = findSemanticPath(graph, "a", "c", "conflict");

    expect(path.name).toBe("Conflict Trail");
    expect(path.nodes.map((node) => node.id)).toEqual(["a", "b", "c"]);
    expect(path.description).toContain("1 refutations");
  });

  it("avoids contradictions in consensus mode when possible", () => {
    const [path] = findSemanticPath(createGraph(), "a", "c", "consensus");

    expect(path.name).toBe("Consensus Lineage");
    expect(path.nodes.map((node) => node.id)).toEqual(["a", "c"]);
  });
});
