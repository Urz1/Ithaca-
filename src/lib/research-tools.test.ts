import { describe, expect, it } from "vitest";
import { findConflictPathFromPayload } from "./research-tools";

describe("findConflictPathFromPayload", () => {
  it("returns a conflict-biased path across typed edges", () => {
    const paths = findConflictPathFromPayload({
      sourceId: "a",
      targetId: "c",
      nodes: [
        { id: "a", title: "A", year: 2018 },
        { id: "b", title: "B", year: 2019 },
        { id: "c", title: "C", year: 2020 },
      ],
      edges: [
        { source: "a", target: "b", edgeType: "contradicts", confidence: 80 },
        { source: "b", target: "c", edgeType: "supports", confidence: 70 },
      ],
    });

    expect(paths.length).toBeGreaterThan(0);
    expect(paths[0].nodes.map((node) => node.id)).toEqual(["a", "b", "c"]);
  });
});
