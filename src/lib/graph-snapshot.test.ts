import { describe, expect, it } from "vitest";
import {
  isGraphSnapshotPayload,
  resolveExploreEntryTarget,
  serializeGraphSnapshot,
  GRAPH_SNAPSHOT_KIND,
} from "./graph-snapshot";
import Graph from "graphology";

describe("resolveExploreEntryTarget", () => {
  it("accepts OpenAlex work IDs and URLs", () => {
    expect(resolveExploreEntryTarget("W123456789")).toBe("W123456789");
    expect(resolveExploreEntryTarget("https://openalex.org/W123456789")).toBe(
      "W123456789",
    );
  });

  it("extracts DOIs from bare and URL forms", () => {
    expect(resolveExploreEntryTarget("10.1038/nature12373")).toBe(
      "10.1038/nature12373",
    );
    expect(
      resolveExploreEntryTarget("https://doi.org/10.1038/nature12373"),
    ).toBe("10.1038/nature12373");
  });

  it("treats free text as a topic search", () => {
    expect(resolveExploreEntryTarget("CRISPR gene editing")).toBe(
      "topic-CRISPR gene editing",
    );
  });

  it("routes research questions to question targets", () => {
    expect(
      resolveExploreEntryTarget("Does metformin reduce cancer risk?"),
    ).toBe("question-Does metformin reduce cancer risk");
    expect(
      resolveExploreEntryTarget("How do transformers handle long context"),
    ).toBe("question-How do transformers handle long context");
  });
});

describe("serializeGraphSnapshot", () => {
  it("stores a reloadable snapshot payload", () => {
    const graph = new Graph();
    graph.addNode("a", { label: "A", title: "Paper A", hidden: false });
    graph.addNode("b", { label: "B", title: "Paper B", hidden: false });
    graph.addEdge("a", "b", { edgeType: "supports", confidence: 0.9 });

    const snapshot = serializeGraphSnapshot(graph, "W123");
    expect(snapshot.kind).toBe(GRAPH_SNAPSHOT_KIND);
    expect(snapshot.nodes).toHaveLength(2);
    expect(snapshot.edges).toHaveLength(1);
    expect(isGraphSnapshotPayload(snapshot)).toBe(true);
  });
});
