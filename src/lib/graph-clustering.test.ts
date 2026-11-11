import { describe, it, expect } from "vitest";
import {
  extractClusterLabel,
  calculateCentroid,
  clusterIntoSchoolsOfThought,
  buildMetanodeGraph,
  unpackSchoolInPlace,
} from "./graph-clustering";
import type { PaperNode, EdgeData } from "@/lib/api/graph-api";

function mockPaper(
  id: string,
  title: string,
  cluster = 0,
  x = 0,
  y = 0,
): PaperNode {
  return {
    id,
    paperId: id,
    label: `${id} (2024)`,
    title,
    authors: "Smith et al.",
    year: 2024,
    citations: 50,
    references: 20,
    supports: 0,
    refutes: 0,
    cluster,
    x,
    y,
    size: 10,
    color: "#3b82f6",
  };
}

describe("Graph Clustering Engine", () => {
  describe("extractClusterLabel", () => {
    it("extracts top keywords from paper titles ignoring stop words", () => {
      const papers = [
        mockPaper("1", "Attention Is All You Need for Translation"),
        mockPaper("2", "BERT Pretraining of Deep Bidirectional Transformers"),
        mockPaper("3", "RoBERTa Robustly Optimized BERT Approach"),
      ];

      const label = extractClusterLabel(papers, 0);
      expect(label).toBeTruthy();
      // Should combine prominent keywords like Translation, Transformers, Pretraining, Attention
      expect(label).toContain("&");
    });

    it("falls back gracefully when titles are empty or generic", () => {
      const emptyPapers: PaperNode[] = [];
      expect(extractClusterLabel(emptyPapers, 2)).toBe("School 3");
    });
  });

  describe("calculateCentroid", () => {
    it("computes circular coordinates when nodes lack position diversity", () => {
      const papers = [mockPaper("1", "Paper 1", 0, 0, 0)];
      const centroid = calculateCentroid(papers, 0, 4, 200);
      expect(centroid.x).toBeDefined();
      expect(centroid.y).toBeDefined();
      // angle for index 0 is -PI/2, cos(-PI/2) ~ 0, sin(-PI/2) = -1
      expect(centroid.y).toBeCloseTo(-200, -1);
    });

    it("averages existing diverse node positions", () => {
      const papers = [
        mockPaper("1", "P1", 0, 100, 200),
        mockPaper("2", "P2", 0, 300, 400),
      ];
      const centroid = calculateCentroid(papers, 0, 2);
      expect(centroid.x).toBe(200);
      expect(centroid.y).toBe(300);
    });
  });

  describe("clusterIntoSchoolsOfThought", () => {
    it("handles empty nodes and edges cleanly", () => {
      const result = clusterIntoSchoolsOfThought([], []);
      expect(result.schools).toHaveLength(0);
      expect(result.metaEdges).toHaveLength(0);
    });

    it("partitions papers into 3-6 schools and tallies disputes", () => {
      const nodes: PaperNode[] = [
        // School 0
        mockPaper("p1", "Self Attention Transformer Architecture", 0),
        mockPaper("p2", "Scaled Dot Product Attention in Vision", 0),
        mockPaper("p3", "Transformer Pretraining Objectives", 0),
        // School 1
        mockPaper("p4", "Recurrent Neural Networks for Sequence Modeling", 1),
        mockPaper("p5", "LSTM Memory Retention in Sequence Tasks", 1),
        // School 2
        mockPaper("p6", "Convolutional Alternatives to Attention", 2),
        mockPaper("p7", "Depthwise Separable Convolutions", 2),
      ];

      const edges: EdgeData[] = [
        // Internal edge
        {
          id: "e1",
          source: "p1",
          target: "p2",
          edgeType: "supports",
          confidence: 90,
          size: 1,
          color: "#10b981",
        },
        // Cross-school refutation (Dispute bridge!)
        {
          id: "e2",
          source: "p1",
          target: "p4",
          edgeType: "contradicts",
          confidence: 85,
          size: 2,
          color: "#ef4444",
        },
        // Cross-school support
        {
          id: "e3",
          source: "p6",
          target: "p1",
          edgeType: "supports",
          confidence: 80,
          size: 1,
          color: "#10b981",
        },
      ];

      const result = clusterIntoSchoolsOfThought(nodes, edges);

      expect(result.schools.length).toBeGreaterThanOrEqual(2);
      expect(result.schools.length).toBeLessThanOrEqual(6);

      // Verify nodeToSchool mapping
      expect(result.nodeToSchool.get("p1")).toBeDefined();
      expect(result.nodeToSchool.get("p4")).toBeDefined();

      // Check dispute tally
      const schoolWithDispute = result.schools.find((s) => s.disputeCount > 0);
      expect(schoolWithDispute).toBeDefined();

      // Check MetaEdges
      expect(result.metaEdges.length).toBeGreaterThanOrEqual(1);
      const disputeMetaEdge = result.metaEdges.find(
        (m) => m.edgeType === "contradicts",
      );
      expect(disputeMetaEdge).toBeDefined();
      expect(disputeMetaEdge?.contradictionsCount).toBeGreaterThanOrEqual(1);
    });
  });

  describe("buildMetanodeGraph and unpackSchoolInPlace", () => {
    it("creates a Graphology instance with metanodes and unpacks member papers", () => {
      const nodes: PaperNode[] = [
        mockPaper("p1", "Self Attention Transformer Architecture", 0, 10, 20),
        mockPaper("p2", "Scaled Dot Product Attention", 0, 15, 25),
        mockPaper("p3", "Recurrent LSTMs for Language", 1, 100, 120),
      ];

      const edges: EdgeData[] = [
        {
          id: "e1",
          source: "p1",
          target: "p2",
          edgeType: "supports",
          confidence: 90,
          size: 1,
          color: "#10b981",
        },
        {
          id: "e2",
          source: "p1",
          target: "p3",
          edgeType: "contradicts",
          confidence: 85,
          size: 2,
          color: "#ef4444",
        },
      ];

      const { schools, metaEdges } = clusterIntoSchoolsOfThought(nodes, edges);
      const metanodeGraph = buildMetanodeGraph(schools, metaEdges);

      expect(metanodeGraph.order).toBe(schools.length);
      schools.forEach((s) => {
        expect(metanodeGraph.hasNode(s.id)).toBe(true);
        expect(metanodeGraph.getNodeAttribute(s.id, "isMetanode")).toBe(true);
      });

      // Unpack the first school
      const schoolToUnpack = schools[0];
      unpackSchoolInPlace(
        metanodeGraph,
        schoolToUnpack.id,
        nodes,
        edges,
        schools,
      );

      // Metanode should be removed
      expect(metanodeGraph.hasNode(schoolToUnpack.id)).toBe(false);

      // Member papers should now be in the graph
      schoolToUnpack.papers.forEach((p) => {
        expect(metanodeGraph.hasNode(p.id)).toBe(true);
      });

      // Internal edges should be present
      expect(metanodeGraph.hasEdge("e1")).toBe(true);
    });
  });
});
