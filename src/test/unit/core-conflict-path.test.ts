import { describe, expect, it } from "vitest";
import Graph from "graphology";
import {
  CORPUS_PAPERS,
  CORPUS_CITATIONS,
} from "../fixtures/test-corpus-10-papers";
import { findSemanticPath } from "@/lib/graph-algorithms";
import {
  buildGraphFromPayload,
  findConflictPathFromPayload,
} from "@/lib/research-tools";
import { COLORS } from "@/lib/constants";

function build10PaperGraph(): Graph {
  const graph = new Graph({ multi: false, type: "directed" });

  // Add all 10 nodes
  for (const paper of Object.values(CORPUS_PAPERS)) {
    graph.addNode(paper.id, {
      title: paper.title,
      label: paper.title,
      authors: paper.authorsFormatted,
      year: paper.year,
      doi: paper.doi,
      venue: paper.venue,
    });
  }

  // Add all dialectic edges
  for (const cite of CORPUS_CITATIONS) {
    if (graph.hasNode(cite.citingId) && graph.hasNode(cite.citedId)) {
      if (!graph.hasEdge(cite.citingId, cite.citedId)) {
        graph.addEdge(cite.citingId, cite.citedId, {
          edgeType: cite.expectedStance,
          confidence: cite.expectedStance === "contradicts" ? 90 : 85,
          snippet: cite.citationContexts[0],
          contexts: cite.citationContexts,
        });
      }
    }
  }

  return graph;
}

describe("Core Epistemic Pipeline: Dialectic Topology & Conflict Path Tracing", () => {
  it("TC-PATH-01: Correctly constructs a 10-node, 11-edge citation topology", () => {
    const graph = build10PaperGraph();
    expect(graph.order).toBe(10);
    expect(graph.size).toBe(11);

    // Verify root node Vaswani has in-degree of 5 (BERT, Transformer-XL, Compressive, Dong, GPT-3)
    const vaswaniInDegree = graph.inDegree(CORPUS_PAPERS.P1_VASWANI_2017.id);
    expect(vaswaniInDegree).toBe(5);
  });

  it("TC-PATH-02: Discovers direct conflict trail between Bubeck (2023) and Bender (2021)", () => {
    const graph = build10PaperGraph();
    const sourceId = CORPUS_PAPERS.P10_BUBECK_2023.id;
    const targetId = CORPUS_PAPERS.P9_BENDER_2021.id;

    const paths = findSemanticPath(graph, sourceId, targetId, "conflict");
    expect(paths).toHaveLength(1);

    const path = paths[0];
    expect(path.name).toBe("Conflict Trail");
    expect(path.color).toBe(COLORS.PATH.CONFLICT);
    expect(path.nodes).toHaveLength(2);
    expect(path.nodes[0].id).toBe(sourceId);
    expect(path.nodes[1].id).toBe(targetId);
    expect(path.edges).toHaveLength(1);
    expect(path.edges[0].type).toBe("contradicts");
    expect(path.description).toContain("Found a path with 1 refutations");
  });

  it("TC-PATH-03: Traces multi-hop dialectic controversy chain across LLM generations", () => {
    const graph = build10PaperGraph();
    // Bubeck 2023 (Sparks of AGI) -> Bender 2021 (Parrots) -> Brown 2020 (GPT-3) -> Vaswani 2017 (Attention)
    const sourceId = CORPUS_PAPERS.P10_BUBECK_2023.id;
    const targetId = CORPUS_PAPERS.P1_VASWANI_2017.id;

    const paths = findSemanticPath(graph, sourceId, targetId, "conflict");
    expect(paths).toHaveLength(1);

    const path = paths[0];
    expect(path.name).toBe("Conflict Trail");
    expect(path.color).toBe(COLORS.PATH.CONFLICT);
    expect(path.nodes).toHaveLength(4);

    // Verify node sequence along the debate trail
    expect(path.nodes[0].id).toBe(CORPUS_PAPERS.P10_BUBECK_2023.id);
    expect(path.nodes[1].id).toBe(CORPUS_PAPERS.P9_BENDER_2021.id);
    expect(path.nodes[2].id).toBe(CORPUS_PAPERS.P8_BROWN_2020.id);
    expect(path.nodes[3].id).toBe(CORPUS_PAPERS.P1_VASWANI_2017.id);

    // Verify edge sequence: Bubeck -[contradicts]-> Bender -[contradicts]-> GPT3 -[extends]-> Vaswani
    expect(path.edges).toHaveLength(3);
    expect(path.edges[0].type).toBe("contradicts");
    expect(path.edges[1].type).toBe("contradicts");
    expect(path.edges[2].type).toBe("extends");
    expect(path.description).toContain("Found a path with 2 refutations");
  });

  it("TC-PATH-04: Resolves Consensus Lineage in consensus mode without contradictions", () => {
    const graph = build10PaperGraph();
    // Brown 2020 (GPT-3) -> Vaswani 2017 (Attention)
    const sourceId = CORPUS_PAPERS.P8_BROWN_2020.id;
    const targetId = CORPUS_PAPERS.P1_VASWANI_2017.id;

    const paths = findSemanticPath(graph, sourceId, targetId, "consensus");
    expect(paths).toHaveLength(1);

    const path = paths[0];
    expect(path.name).toBe("Consensus Lineage");
    expect(path.color).toBe(COLORS.PATH.CONSENSUS);
    expect(path.edges[0].type).toBe("extends");
    expect(path.description).toBe(
      "A path of supporting evidence and extensions.",
    );
  });

  it("TC-PATH-05: Validates payload serialization for the conflict-path API route", () => {
    const payload = {
      nodes: Object.values(CORPUS_PAPERS).map((p) => ({
        id: p.id,
        title: p.title,
        year: p.year,
        authors: p.authorsFormatted,
      })),
      edges: CORPUS_CITATIONS.map((c) => ({
        source: c.citingId,
        target: c.citedId,
        edgeType: c.expectedStance,
        confidence: c.expectedStance === "contradicts" ? 92 : 88,
      })),
    };

    const graph = buildGraphFromPayload(payload);
    expect(graph.order).toBe(10);
    expect(graph.size).toBe(11);

    const conflictPaths = findConflictPathFromPayload({
      sourceId: CORPUS_PAPERS.P7_DONG_2021.id,
      targetId: CORPUS_PAPERS.P1_VASWANI_2017.id,
      nodes: payload.nodes,
      edges: payload.edges,
    });

    expect(conflictPaths).toHaveLength(1);
    expect(conflictPaths[0].name).toBe("Conflict Trail");
    expect(conflictPaths[0].edges[0].type).toBe("contradicts");
    expect(conflictPaths[0].nodes[0].title).toBe(
      "Attention is Not All You Need: Pure Attention Loses Rank Doubly Exponentially",
    );
    expect(conflictPaths[0].nodes[1].title).toBe("Attention Is All You Need");
  });
});
