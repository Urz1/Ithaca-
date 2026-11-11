import { describe, expect, it } from "vitest";
import Graph from "graphology";
import {
  buildDebateReport,
  renderDebateReportMarkdown,
  generateDebateMatrixFromGraph,
  generateDebateMatrix,
  exportMatrixToMarkdown,
  exportMatrixToCSV,
  exportMatrixToLaTeX,
} from "./debate-report";

describe("buildDebateReport", () => {
  it("includes contradictions, corrections, and low-confidence edges", () => {
    const graph = new Graph();
    graph.addNode("a", { title: "Paper A", year: 2020 });
    graph.addNode("b", { title: "Paper B", year: 2021 });
    graph.addNode("c", { title: "Paper C", year: 2022 });
    graph.addEdge("a", "b", {
      edgeType: "contradicts",
      confidence: 80,
      snippet: "However, we find the opposite result.",
    });
    graph.addEdge("b", "c", {
      edgeType: "supports",
      confidence: 30,
      signalSource: "llm+titles",
    });
    graph.addEdge("a", "c", {
      edgeType: "extends",
      confidence: 100,
      provider: "user-correction",
      snippet: "User corrected relationship to extends.",
    });

    const report = buildDebateReport(graph, {
      title: "Test Debate",
      query: "topic-test",
    });

    expect(report.contestedClaims).toHaveLength(3);
    expect(report.corrections).toHaveLength(1);
    expect(report.uncertainClaims).toHaveLength(1);

    const markdown = renderDebateReportMarkdown(report);
    expect(markdown).toContain("# Test Debate");
    expect(markdown).toContain("However, we find the opposite result.");
    expect(markdown).toContain("Human corrected");
  });

  it("returns empty contested sections for graphs without debate signal", () => {
    const graph = new Graph();
    graph.addNode("a", { title: "Paper A", year: 2020 });
    graph.addNode("b", { title: "Paper B", year: 2021 });
    graph.addEdge("a", "b", {
      edgeType: "supports",
      confidence: 92,
      signalSource: "llm+abstracts",
      snippet: "Our results align with prior work.",
    });
    graph.addEdge("b", "a", {
      edgeType: "cites",
      confidence: 88,
    });

    const report = buildDebateReport(graph, { title: "Quiet map" });
    expect(report.contestedClaims).toHaveLength(0);
    expect(report.corrections).toHaveLength(0);
    expect(report.uncertainClaims).toHaveLength(0);

    const markdown = renderDebateReportMarkdown(report);
    expect(markdown).toContain("No contested or uncertain claims");
    expect(markdown).toContain("No human corrections recorded");
  });

  it("filters out hidden edges and keeps only contested claims", () => {
    const graph = new Graph();
    graph.addNode("a", { title: "Paper A" });
    graph.addNode("b", { title: "Paper B" });
    graph.addNode("c", { title: "Paper C" });
    graph.addEdge("a", "b", {
      edgeType: "contradicts",
      confidence: 75,
      snippet: "Visible contested edge.",
    });
    graph.addEdge("b", "c", {
      edgeType: "supports",
      confidence: 95,
      hidden: true,
      snippet: "Hidden support should not export.",
    });

    const report = buildDebateReport(graph);
    expect(report.contestedClaims).toHaveLength(1);
    expect(report.contestedClaims[0].citedTitle).toBe("Paper B");
  });
});

describe("DebateMatrix Generation & Serialization", () => {
  it("generates a matrix from Graphology graph and counts controversies", () => {
    const graph = new Graph();
    graph.addNode("p1", {
      title: "Transformer Base",
      year: 2017,
      authors: "Vaswani et al.",
    });
    graph.addNode("p2", {
      title: "FlashAttention",
      year: 2022,
      authors: "Dao et al.",
    });
    graph.addNode("p3", {
      title: "Linformer",
      year: 2020,
      authors: "Wang et al.",
    });

    graph.addEdge("p2", "p1", {
      edgeType: "contradicts",
      confidence: 90,
      snippet:
        "Standard attention has O(N^2) memory bottleneck, solved via IO awareness.",
      contexts: ["We dispute the necessity of quadratic HBM accesses."],
    });

    graph.addEdge("p3", "p1", {
      edgeType: "supports",
      confidence: 85,
      snippet: "Confirms attention rank collapse empirically.",
    });

    const matrix = generateDebateMatrixFromGraph(graph, {
      title: "Transformers Debate",
      topic: "Attention Complexity",
    });

    expect(matrix.title).toBe("Transformers Debate");
    expect(matrix.topic).toBe("Attention Complexity");
    expect(matrix.rows).toHaveLength(2);
    expect(matrix.totalDisputes).toBe(1);
    expect(matrix.totalConfirmations).toBe(1);

    // Refutations ordered first
    expect(matrix.rows[0].edgeType).toBe("contradicts");
    expect(matrix.rows[0].citingPaper).toBe("FlashAttention");
    expect(matrix.rows[0].targetPaper).toBe("Transformer Base");
  });

  it("generates a matrix from raw PaperNode and EdgeData arrays", () => {
    const nodes = [
      {
        id: "a1",
        paperId: "a1",
        label: "P1",
        title: "CRISPR-Cas9 Editing",
        authors: "Doudna et al.",
        year: 2012,
        citations: 1000,
        references: 50,
        supports: 0,
        refutes: 0,
        cluster: 0,
        x: 0,
        y: 0,
        size: 10,
        color: "#3b82f6",
      },
      {
        id: "a2",
        paperId: "a2",
        label: "P2",
        title: "Off-Target Mutations in CRISPR",
        authors: "Fu et al.",
        year: 2013,
        citations: 500,
        references: 30,
        supports: 0,
        refutes: 0,
        cluster: 0,
        x: 0,
        y: 0,
        size: 10,
        color: "#ef4444",
      },
    ];

    const edges = [
      {
        id: "e-bio-1",
        source: "a2",
        target: "a1",
        edgeType: "contradicts" as const,
        confidence: 94,
        size: 2,
        color: "#ef4444",
        snippet:
          "Demonstrates substantial off-target mutations not accounted for in initial models.",
      },
    ];

    const matrix = generateDebateMatrix(nodes, edges);
    expect(matrix.rows).toHaveLength(1);
    expect(matrix.rows[0].citingPaper).toBe("Off-Target Mutations in CRISPR");
    expect(matrix.rows[0].targetPaper).toBe("CRISPR-Cas9 Editing");
    expect(matrix.totalDisputes).toBe(1);
  });

  it("serializes matrix cleanly to Markdown, CSV, and LaTeX", () => {
    const matrix = {
      title: "Genome Editing Disputes",
      topic: "CRISPR Safety",
      generatedAt: "2026-09-08T12:00:00.000Z",
      rows: [
        {
          id: "r1",
          sourceId: "s1",
          targetId: "t1",
          citingPaper: "Safety Assessment of CRISPR & Cas9",
          citingYear: 2023,
          targetPaper: "Initial Clinical Trial (2020)",
          targetYear: 2020,
          edgeType: "contradicts" as const,
          confidence: 88,
          methodologyOrContext: "Deep sequencing on 500 samples",
          coreClaimOrSnippet:
            "Observed 12% unintended indels in non-coding regions.",
        },
      ],
      totalDisputes: 1,
      totalConfirmations: 0,
    };

    // Markdown Table
    const md = exportMatrixToMarkdown(matrix);
    expect(md).toContain("| Baseline / Benchmark | Challenging Work (Year) |");
    expect(md).toContain("🔴 Refutes");
    expect(md).toContain("Safety Assessment of CRISPR & Cas9 (2023)");

    // CSV
    const csv = exportMatrixToCSV(matrix);
    expect(csv).toContain("Target Benchmark,Target Year,Challenging Paper");
    expect(csv).toContain('"Initial Clinical Trial (2020)"');
    expect(csv).toContain('"contradicts"');

    // LaTeX Table
    const latex = exportMatrixToLaTeX(matrix);
    expect(latex).toContain("\\begin{table*}[htbp]");
    expect(latex).toContain("\\begin{tabular}");
    expect(latex).toContain("\\textbf{\\textcolor{red}{Refutes}}");
    expect(latex).toContain("\\&"); // Check proper escaping of ampersand
    expect(latex).toContain("\\end{tabular}");
    expect(latex).toContain("\\end{table*}");
  });
});
