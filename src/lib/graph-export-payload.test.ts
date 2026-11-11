import Graph from "graphology";
import { describe, expect, it } from "vitest";
import {
  buildGraphExportPayload,
  isDurableExportFormat,
} from "@/lib/graph-export-payload";

describe("graph-export-payload", () => {
  it("builds json export payloads", () => {
    const graph = new Graph();
    graph.addNode("a", { label: "Paper A", title: "Paper A", year: 2024 });
    graph.addNode("b", { label: "Paper B" });
    graph.addEdge("a", "b", { type: "supports" });

    const payload = buildGraphExportPayload(graph, {
      format: "json",
      filename: "network",
    });

    expect(payload.encoding).toBe("utf8");
    expect(payload.filename).toBe("network.json");
    expect(payload.content).toContain('"Paper A"');
    expect(isDurableExportFormat("json")).toBe(true);
    expect(isDurableExportFormat("png")).toBe(false);
  });
});
