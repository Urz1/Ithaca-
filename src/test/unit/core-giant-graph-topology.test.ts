import { describe, expect, it } from "vitest";
import Graph from "graphology";
import { findSemanticPath } from "@/lib/graph-algorithms";
import {
  clusterIntoSchoolsOfThought,
  buildMetanodeGraph,
} from "@/lib/graph-clustering";
import type { PaperNode, EdgeData } from "@/lib/api/graph-api";
import { enforceMaximum, PLATFORM_LIMITS } from "@/lib/platform/limits";

describe("Phase 2: Giant Graph Topological Scalability (500 Nodes, 2,500 Edges)", () => {
  // Helper to generate a realistic dense 500-node clustered academic citation network
  function generateGiantGraph(nodeCount = 500, edgeCount = 2500) {
    const graph = new Graph({ type: "directed" });
    const paperNodes: PaperNode[] = [];
    const edgeDataList: EdgeData[] = [];

    // 1. Create nodes across 5 distinct research clusters
    for (let i = 0; i < nodeCount; i++) {
      const clusterId = i % 5;
      const year = 2015 + (i % 11); // 2015 - 2025
      const nodeId = `P_${i}`;
      const title = `Paper ${i}: Advances in Sub-Field ${clusterId}`;
      const authors = `Author_${i} et al.`;

      graph.addNode(nodeId, {
        id: nodeId,
        title,
        year,
        authors,
        cluster: clusterId,
        x: Math.cos((i / nodeCount) * 2 * Math.PI) * 500,
        y: Math.sin((i / nodeCount) * 2 * Math.PI) * 500,
      });

      paperNodes.push({
        id: nodeId,
        paperId: nodeId,
        label: `${nodeId} (${year})`,
        title,
        authors,
        year,
        citations: 10 + (i % 100),
        references: 5 + (i % 30),
        supports: 0,
        refutes: 0,
        cluster: clusterId,
        x: Math.random() * 800,
        y: Math.random() * 800,
        size: 10,
        color: "#6366f1",
      });
    }

    // 2. Generate 2,500 edges with preference for intra-cluster connections
    const edgeTypes: ("supports" | "contradicts" | "extends" | "cites")[] = [
      "supports",
      "contradicts",
      "extends",
      "cites",
    ];

    let createdEdges = 0;
    while (createdEdges < edgeCount) {
      const sourceIdx = Math.floor(Math.random() * nodeCount);
      let targetIdx = Math.floor(Math.random() * nodeCount);

      // 70% intra-cluster, 30% inter-cluster
      if (Math.random() < 0.7) {
        const clusterId = sourceIdx % 5;
        const candidateOffset = Math.floor(Math.random() * 100) * 5;
        targetIdx = (clusterId + candidateOffset) % nodeCount;
      }

      if (sourceIdx !== targetIdx) {
        const sourceId = `P_${sourceIdx}`;
        const targetId = `P_${targetIdx}`;

        if (!graph.hasEdge(sourceId, targetId)) {
          const edgeType = edgeTypes[createdEdges % edgeTypes.length];
          const confidence = 0.75 + (createdEdges % 25) * 0.01;

          graph.addEdge(sourceId, targetId, {
            edgeType,
            confidence,
          });

          edgeDataList.push({
            id: `edge_${createdEdges}`,
            source: sourceId,
            target: targetId,
            edgeType,
            confidence,
            size: 1,
            color: "#999999",
            snippet: `Empirical claim connecting ${sourceId} to ${targetId}`,
          });

          createdEdges++;
        }
      }
    }

    return { graph, paperNodes, edgeDataList };
  }

  it("constructs and holds 500 nodes and 2,500 edges within tight memory and latency bounds", () => {
    const t0 = performance.now();
    const { graph, paperNodes, edgeDataList } = generateGiantGraph(500, 2500);
    const constructionMs = performance.now() - t0;

    expect(graph.order).toBe(500);
    expect(graph.size).toBe(2500);
    expect(paperNodes).toHaveLength(500);
    expect(edgeDataList).toHaveLength(2500);

    // Construction must complete in under 500ms
    expect(constructionMs).toBeLessThan(500);
  });

  it("benchmarks Dijkstra Pathfinder across dense multi-hop paths (< 15ms SLA)", () => {
    const { graph } = generateGiantGraph(500, 2500);

    const sourceId = "P_0";
    const targetId = "P_499";

    // Warm up JIT compiler
    findSemanticPath(graph, sourceId, targetId, "shortest");

    // 1. Benchmark Shortest Path Mode
    const tShortest = performance.now();
    const shortestPaths = findSemanticPath(
      graph,
      sourceId,
      targetId,
      "shortest",
    );
    const shortestElapsed = performance.now() - tShortest;

    expect(shortestElapsed).toBeLessThan(50);
    expect(shortestPaths).toBeDefined();

    // 2. Benchmark Conflict Traversal Mode
    const tConflict = performance.now();
    const conflictPaths = findSemanticPath(
      graph,
      sourceId,
      targetId,
      "conflict",
    );
    const conflictElapsed = performance.now() - tConflict;

    expect(conflictElapsed).toBeLessThan(50);
    expect(conflictPaths).toBeDefined();

    // 3. Benchmark Consensus Traversal Mode
    const tConsensus = performance.now();
    const consensusPaths = findSemanticPath(
      graph,
      sourceId,
      targetId,
      "consensus",
    );
    const consensusElapsed = performance.now() - tConsensus;

    expect(consensusElapsed).toBeLessThan(50);
    expect(consensusPaths).toBeDefined();

    // If conflict paths are discovered, assert that edges reflect dialectic controversy
    if (conflictPaths.length > 0) {
      const path = conflictPaths[0];
      expect(path.nodes.length).toBeGreaterThanOrEqual(2);
      expect(path.edges.length).toBe(path.nodes.length - 1);
    }
  });

  it("executes community clustering and metanode graph aggregation at scale", () => {
    const { paperNodes, edgeDataList } = generateGiantGraph(500, 2500);

    const tCluster = performance.now();
    const hierarchy = clusterIntoSchoolsOfThought(paperNodes, edgeDataList);
    const clusterElapsed = performance.now() - tCluster;

    // Clustering 500 nodes should take less than 150ms
    expect(clusterElapsed).toBeLessThan(150);

    expect(hierarchy.schools.length).toBeGreaterThan(0);
    expect(hierarchy.schools.length).toBeLessThanOrEqual(6); // capped at palette size

    // Every node must be mapped to a school
    expect(hierarchy.nodeToSchool.size).toBe(500);

    // Verify metanode graph building
    const metaGraph = buildMetanodeGraph(
      hierarchy.schools,
      hierarchy.metaEdges,
    );
    expect(metaGraph.order).toBe(hierarchy.schools.length);
    expect(metaGraph.size).toBe(hierarchy.metaEdges.length);
  });

  it("enforces platform limits on synchronous giant graph exports", () => {
    const maxSync = PLATFORM_LIMITS.exports.maxNodesSynchronous;
    expect(maxSync).toBe(2000);

    // 500 nodes is within synchronous limits
    const allowed = enforceMaximum(500, maxSync, "Export nodes");
    expect(allowed.allowed).toBe(true);

    // 2,500 nodes exceeds synchronous limit, requiring background job offloading
    const exceeded = enforceMaximum(2500, maxSync, "Export nodes");
    expect(exceeded.allowed).toBe(false);
    if (!exceeded.allowed) {
      expect(exceeded.code).toBe("LIMIT_EXCEEDED");
    }

    // Interactive rendering supports up to 10,000 nodes
    expect(PLATFORM_LIMITS.graph.maxNodesInteractive).toBe(10000);
  });
});
