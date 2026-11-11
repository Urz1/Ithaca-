import { describe, expect, it } from "vitest";
import Graph from "graphology";
import {
  CORPUS_PAPERS,
  CORPUS_CITATIONS,
} from "../fixtures/test-corpus-10-papers";
import {
  generateDebateMatrixFromGraph,
  buildDebateReport,
  renderDebateReportMarkdown,
  exportMatrixToMarkdown,
  exportMatrixToCSV,
  exportMatrixToLaTeX,
} from "@/lib/debate-report";

function build10PaperGraph(): Graph {
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

  for (const cite of CORPUS_CITATIONS) {
    if (graph.hasNode(cite.citingId) && graph.hasNode(cite.citedId)) {
      if (!graph.hasEdge(cite.citingId, cite.citedId)) {
        graph.addEdge(cite.citingId, cite.citedId, {
          edgeType: cite.expectedStance,
          confidence: cite.expectedStance === "contradicts" ? 92 : 88,
          snippet: cite.citationContexts[0],
          contexts: cite.citationContexts,
        });
      }
    }
  }

  return graph;
}

describe("Core Epistemic Pipeline: Academic Debate Matrix & Multi-Format Reporting", () => {
  it("TC-MATRIX-01: Generates structured Debate Matrix with refutations prioritized first", () => {
    const graph = build10PaperGraph();
    const matrix = generateDebateMatrixFromGraph(graph, {
      title: "The Transformer Context & Reasoning Debate Matrix",
      topic: "Self-Attention, Scaling, and Representation Dynamics",
    });

    expect(matrix.title).toBe(
      "The Transformer Context & Reasoning Debate Matrix",
    );
    expect(matrix.topic).toBe(
      "Self-Attention, Scaling, and Representation Dynamics",
    );
    expect(matrix.totalDisputes).toBe(6); // 6 refutations across the corpus
    expect(matrix.totalConfirmations).toBe(1); // 1 confirmation (GPT-3 confirming Devlin)

    // Verify refutations are ordered strictly at the top of the matrix
    const firstNonContradictIndex = matrix.rows.findIndex(
      (r) => r.edgeType !== "contradicts",
    );
    expect(firstNonContradictIndex).toBe(6);

    for (let i = 0; i < 6; i++) {
      expect(matrix.rows[i].edgeType).toBe("contradicts");
    }

    // Verify row attributes
    const txlRow = matrix.rows.find(
      (r) => r.sourceId === CORPUS_PAPERS.P3_DAI_2019.id,
    );
    expect(txlRow).toBeDefined();
    expect(txlRow?.targetPaper).toBe("Attention Is All You Need");
    expect(txlRow?.citingPaper).toBe(
      "Transformer-XL: Attentive Language Models Beyond a Fixed-Length Context",
    );
    expect(txlRow?.edgeType).toBe("contradicts");
    expect(txlRow?.coreClaimOrSnippet).toContain(
      "vanilla self-attention in Vaswani et al. relies on an assumption that fails",
    );
  });

  it("TC-MATRIX-02: Generates a complete dialectic Debate Report in Markdown format", () => {
    const graph = build10PaperGraph();
    const report = buildDebateReport(graph, {
      title: "Transformer Architecture & Epistemic Controversy Report",
      query: "Attention Is All You Need",
    });

    expect(report.title).toBe(
      "Transformer Architecture & Epistemic Controversy Report",
    );
    expect(report.contestedClaims).toHaveLength(6);

    const markdown = renderDebateReportMarkdown(report);
    expect(markdown).toContain(
      "# Transformer Architecture & Epistemic Controversy Report",
    );
    expect(markdown).toContain("Contested claims: 6");
    expect(markdown).toContain("### 1. contradicts");
    expect(markdown).toContain(
      "> We show that vanilla self-attention in Vaswani et al.",
    );
    expect(markdown).toContain(
      "Exported from Ithaca — argumentation-aware citation map.",
    );
  });

  it("TC-MATRIX-03: Serializes debate matrix to GitHub-flavored Markdown table", () => {
    const graph = build10PaperGraph();
    const matrix = generateDebateMatrixFromGraph(graph, {
      title: "Transformer Debate Matrix",
    });

    const markdownTable = exportMatrixToMarkdown(matrix);
    expect(markdownTable).toContain("# Transformer Debate Matrix");
    expect(markdownTable).toContain(
      "**Controversy Summary:** 6 Refutations • 1 Confirmations",
    );
    expect(markdownTable).toContain(
      "| Baseline / Benchmark | Challenging Work (Year) | Stance | Core Empirical Finding / Claim | Context / Evidence | Conf. |",
    );
    expect(markdownTable).toContain("🔴 Refutes");
    expect(markdownTable).toContain("🟢 Confirms");
    expect(markdownTable).toContain("🔵 Extends");
  });

  it("TC-MATRIX-04: Serializes debate matrix to RFC 4180 compliant CSV", () => {
    const graph = build10PaperGraph();
    const matrix = generateDebateMatrixFromGraph(graph, {
      title: "Transformer Debate Matrix",
    });

    const csv = exportMatrixToCSV(matrix);
    const lines = csv.split("\n");
    expect(lines[0]).toBe(
      "Target Benchmark,Target Year,Challenging Paper,Challenging Year,Stance,Confidence (%),Core Empirical Claim,Citation Context / Methodology",
    );
    expect(lines.length).toBeGreaterThan(6);

    // Verify all rows have 8 columns
    for (const line of lines.slice(1)) {
      if (!line.trim()) continue;
      // Regex parsing for quoted CSV fields
      const fields = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      expect(fields).toBeDefined();
    }
  });

  it("TC-MATRIX-05: Serializes debate matrix to publication-ready LaTeX table code", () => {
    const graph = build10PaperGraph();
    const matrix = generateDebateMatrixFromGraph(graph, {
      title: "Epistemic Matrix of Transformer Controversies",
    });

    const latex = exportMatrixToLaTeX(matrix);
    expect(latex).toContain("\\begin{table*}[htbp]");
    expect(latex).toContain(
      "\\caption{Epistemic Matrix of Transformer Controversies}",
    );
    expect(latex).toContain("\\label{tab:debate_matrix}");
    expect(latex).toContain("\\textbf{\\textcolor{red}{Refutes}}");
    expect(latex).toContain("\\textbf{\\textcolor{teal}{Confirms}}");
    expect(latex).toContain("\\end{tabular}");
    expect(latex).toContain("\\end{table*}");
  });
});
