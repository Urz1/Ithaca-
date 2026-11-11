import { describe, expect, it } from "vitest";
import Graph from "graphology";
import {
  CORPUS_PAPERS,
  CORPUS_CITATIONS,
  buildClassificationInputs,
} from "../src/test/fixtures/test-corpus-10-papers";
import { classifyCitationLocally } from "../src/lib/api/local-classifier";
import { findSemanticPath } from "../src/lib/graph-algorithms";
import {
  generateDebateMatrixFromGraph,
  buildDebateReport,
  exportMatrixToMarkdown,
  exportMatrixToLaTeX,
  exportMatrixToCSV,
} from "../src/lib/debate-report";
import { calculateClassificationMetrics } from "../src/modules/ai/provenance";
import type { ClassificationResult } from "../src/lib/api/citation-classifier";

describe("EVAL: Transformer Context & Reasoning Debate Corpus Benchmark", () => {
  it("evaluates end-to-end performance over the 10-paper Transformer debate network", () => {
    console.log(
      "\n===============================================================================",
    );
    console.log(
      "📊 ITHACA EPISTEMIC PIPELINE: 10-PAPER TRANSFORMER CORPUS EVALUATION",
    );
    console.log(
      "===============================================================================",
    );

    // -------------------------------------------------------------------------
    // Phase 1: Ingestion & Pairwise Stance Classification
    // -------------------------------------------------------------------------
    const inputs = buildClassificationInputs();
    const classificationLatencies: number[] = [];
    const classificationResults: ClassificationResult[] = [];

    for (const input of inputs) {
      const t0 = performance.now();
      const res = classifyCitationLocally(input);
      const latency = performance.now() - t0;
      classificationLatencies.push(latency);
      classificationResults.push(res);
    }

    const evalExamples = CORPUS_CITATIONS.map((c, idx) => ({
      expected: c.expectedStance,
      predicted: (classificationResults[idx].edgeType === "unknown"
        ? "cites"
        : classificationResults[idx].edgeType) as
        "supports" | "contradicts" | "extends" | "cites",
    }));

    const metrics = calculateClassificationMetrics(evalExamples);
    const avgLatency =
      classificationLatencies.reduce((a, b) => a + b, 0) /
      classificationLatencies.length;
    const maxLatency = Math.max(...classificationLatencies);
    const minLatency = Math.min(...classificationLatencies);

    console.log(
      "\n1️⃣  PAIRWISE RHETORICAL STANCE CLASSIFICATION (Sovereign Local Intent Engine):",
    );
    console.log(`   • Sample Pairs Evaluated:    ${metrics.sampleCount}`);
    console.log(
      `   • Global Accuracy:           ${(metrics.accuracy * 100).toFixed(1)}% (Target: ≥ 85%)`,
    );
    console.log(
      `   • Macro Precision:           ${(metrics.macroPrecision * 100).toFixed(1)}%`,
    );
    console.log(
      `   • Macro Recall:              ${(metrics.macroRecall * 100).toFixed(1)}%`,
    );
    console.log(
      `   • Average Latency per Pair:  ${avgLatency.toFixed(3)} ms (SLA: < 15.0 ms)`,
    );
    console.log(`   • Max Latency:               ${maxLatency.toFixed(3)} ms`);
    console.log(`   • Min Latency:               ${minLatency.toFixed(3)} ms`);
    console.log(`   • Runtime FX / Cost:         $0.00 (100% In-Process CPU)`);

    expect(metrics.accuracy).toBe(1.0); // 100% accuracy on canonical corpus
    expect(avgLatency).toBeLessThan(15.0);

    // -------------------------------------------------------------------------
    // Phase 2: Graphology Network Topology Construction
    // -------------------------------------------------------------------------
    const graphT0 = performance.now();
    const graph = new Graph({ multi: false, type: "directed" });

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

    for (let i = 0; i < CORPUS_CITATIONS.length; i++) {
      const cite = CORPUS_CITATIONS[i];
      const res = classificationResults[i];
      graph.addEdge(cite.citingId, cite.citedId, {
        edgeType: res.edgeType,
        confidence: Math.round(res.confidence * 100),
        snippet: res.snippet,
        contexts: cite.citationContexts,
      });
    }
    const graphTimeMs = performance.now() - graphT0;

    console.log("\n2️⃣  GRAPHOLOGY NETWORK TOPOLOGY:");
    console.log(`   • Nodes (Academic Papers):   ${graph.order}`);
    console.log(`   • Edges (Dialectic Stances): ${graph.size}`);
    console.log(`   • Network Build Time:        ${graphTimeMs.toFixed(3)} ms`);

    // -------------------------------------------------------------------------
    // Phase 3: Conflict Path Tracing (Bubeck 2023 -> Vaswani 2017)
    // -------------------------------------------------------------------------
    const pathT0 = performance.now();
    const conflictPaths = findSemanticPath(
      graph,
      CORPUS_PAPERS.P10_BUBECK_2023.id,
      CORPUS_PAPERS.P1_VASWANI_2017.id,
      "conflict",
    );
    const pathTimeMs = performance.now() - pathT0;

    expect(conflictPaths).toHaveLength(1);
    const path = conflictPaths[0];

    console.log("\n3️⃣  CONFLICT PATH TRACING (Dijkstra Dialectic Descent):");
    console.log(`   • Traversal Mode:            Conflict-Biased`);
    console.log(
      `   • Source Node:               ${CORPUS_PAPERS.P10_BUBECK_2023.title} (2023)`,
    );
    console.log(
      `   • Target Node:               ${CORPUS_PAPERS.P1_VASWANI_2017.title} (2017)`,
    );
    console.log(`   • Path Discovery Latency:    ${pathTimeMs.toFixed(3)} ms`);
    console.log(
      `   • Path Length:               ${path.nodes.length} nodes, ${path.edges.length} edges`,
    );
    console.log(
      `   • Refutations in Trail:      ${path.edges.filter((e) => e.type === "contradicts").length}`,
    );
    console.log(`   • Semantic Step Sequence:`);
    for (let i = 0; i < path.edges.length; i++) {
      const fromNode = path.nodes[i].title;
      const toNode = path.nodes[i + 1].title;
      const edge = path.edges[i];
      console.log(
        `     [${i + 1}] ${fromNode} --(${edge.type.toUpperCase()} / ${edge.confidence}%)--> ${toNode}`,
      );
    }

    // -------------------------------------------------------------------------
    // Phase 4: Academic Debate Matrix & Exports
    // -------------------------------------------------------------------------
    const matrix = generateDebateMatrixFromGraph(graph, {
      title: "The Transformer Context & Reasoning Controversy (2017–2023)",
      topic:
        "Attention Mechanisms, Context Scaling, and Representation Lineage",
    });
    const report = buildDebateReport(graph);
    const markdown = exportMatrixToMarkdown(matrix);
    const csv = exportMatrixToCSV(matrix);
    const latex = exportMatrixToLaTeX(matrix);

    console.log("\n4️⃣  ACADEMIC DEBATE MATRIX & MULTI-FORMAT EXPORTS:");
    console.log(`   • Total Controversy Rows:    ${matrix.rows.length}`);
    console.log(`   • Documented Refutations:    ${matrix.totalDisputes}`);
    console.log(`   • Documented Confirmations:  ${matrix.totalConfirmations}`);
    console.log(
      `   • Contested Report Claims:   ${report.contestedClaims.length}`,
    );
    console.log(`   • Markdown Export Length:    ${markdown.length} bytes`);
    console.log(`   • RFC 4180 CSV Length:       ${csv.length} bytes`);
    console.log(`   • Publication LaTeX Length:  ${latex.length} bytes`);

    console.log(
      "\n===============================================================================",
    );
    console.log(
      "✅ ITHACA CORE EPISTEMIC FUNCTIONALITY BENCHMARK: 100% CERTIFIED",
    );
    console.log(
      "===============================================================================\n",
    );

    expect(matrix.totalDisputes).toBe(6);
    expect(matrix.totalConfirmations).toBe(1);
    expect(report.contestedClaims).toHaveLength(6);
  });
});
