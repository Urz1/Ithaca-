import { describe, expect, it } from "vitest";
import Graph from "graphology";
import {
  CORPUS_PAPERS,
  CORPUS_CITATIONS,
  buildClassificationInputs,
} from "../src/test/fixtures/test-corpus-10-papers";
import {
  classifyCitation,
  type ClassificationResult,
} from "../src/lib/api/citation-classifier";
import { resetLLMRouterForTesting } from "../src/lib/api/llm-router";
import { findSemanticPath } from "../src/lib/graph-algorithms";
import {
  generateDebateMatrixFromGraph,
  buildDebateReport,
  exportMatrixToMarkdown,
} from "../src/lib/debate-report";
import { calculateClassificationMetrics } from "../src/modules/ai/provenance";
import { vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    citationCache: {
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async () => ({})),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
  },
}));

if (typeof process.loadEnvFile === "function") {
  process.loadEnvFile(".env");
}

describe("EVAL: 10-Paper Transformer Corpus with LIVE Groq AI", () => {
  it("executes the entire epistemic pipeline using live cloud LLM inference", async () => {
    resetLLMRouterForTesting();

    console.log(
      "\n===============================================================================",
    );
    console.log(
      "🌐 LIVE CLOUD AI EVALUATION: 10-PAPER CORPUS (GROQ / QWEN 3.8 27B)",
    );
    console.log(
      "===============================================================================\n",
    );

    const inputs = buildClassificationInputs();
    const classificationLatencies: number[] = [];
    const classificationResults: ClassificationResult[] = [];

    // Process each citation pair through live classifyCitation
    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const groundTruth = CORPUS_CITATIONS[i];

      const t0 = performance.now();
      const res = await classifyCitation(input);
      const latency = performance.now() - t0;

      classificationLatencies.push(latency);
      classificationResults.push(res);

      console.log(
        `[${i + 1}/${inputs.length}] ${input.citingTitle.slice(0, 32)}... → ${input.citedTitle.slice(0, 32)}...`,
      );
      console.log(`     • Provider:   ${res.provider}`);
      console.log(
        `     • Stance:     ${res.edgeType.toUpperCase()} (Confidence: ${(res.confidence * 100).toFixed(1)}%)`,
      );
      console.log(
        `     • Expected:   ${groundTruth.expectedStance.toUpperCase()}`,
      );
      console.log(`     • Snippet:    "${res.snippet}"`);
      console.log(`     • Latency:    ${latency.toFixed(1)} ms\n`);

      // Gentle pause to allow free-tier token bucket to refill
      if (i < inputs.length - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    // Verify AI was genuinely invoked (not local fallback)
    const liveAiResults = classificationResults.filter((r) =>
      r.provider.startsWith("groq/"),
    );
    const gatedResults = classificationResults.filter((r) =>
      r.provider.startsWith("evidence-gate"),
    );
    const fallbackResults = classificationResults.filter(
      (r) =>
        r.provider.includes("local-moat") || r.provider.includes("fallback"),
    );

    console.log(
      "-------------------------------------------------------------------------------",
    );
    console.log("📊 EXECUTION AUDIT BREAKDOWN:");
    console.log(
      `   • Total Citations Evaluated:  ${classificationResults.length}`,
    );
    console.log(
      `   • Live Groq AI Invocations:   ${liveAiResults.length} (${((liveAiResults.length / classificationResults.length) * 100).toFixed(1)}%)`,
    );
    console.log(
      `   • Evidence Gated ("cites"):   ${gatedResults.length} (${((gatedResults.length / classificationResults.length) * 100).toFixed(1)}%)`,
    );
    console.log(
      `   • Fallback / Local Moat:      ${fallbackResults.length} (${((fallbackResults.length / classificationResults.length) * 100).toFixed(1)}%)`,
    );
    console.log(
      "-------------------------------------------------------------------------------\n",
    );

    // Verify live AI handled the majority of directional citations
    expect(liveAiResults.length).toBeGreaterThanOrEqual(5);
    expect(
      liveAiResults.length + gatedResults.length + fallbackResults.length,
    ).toBe(classificationResults.length);

    // Calculate metrics against ground truth
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

    console.log("📈 CLASSIFICATION ACCURACY & DISCOURSE PERFORMANCE:");
    console.log(
      `   • Total Accuracy:             ${(metrics.accuracy * 100).toFixed(1)}%`,
    );
    console.log(
      `   • Macro Precision:            ${(metrics.macroPrecision * 100).toFixed(1)}%`,
    );
    console.log(
      `   • Macro Recall:               ${(metrics.macroRecall * 100).toFixed(1)}%`,
    );
    const f1 =
      metrics.macroPrecision + metrics.macroRecall > 0
        ? (2 * metrics.macroPrecision * metrics.macroRecall) /
          (metrics.macroPrecision + metrics.macroRecall)
        : 0;
    console.log(`   • Macro F1 Score:             ${(f1 * 100).toFixed(1)}%`);
    console.log(
      `   • Average Latency per Edge:   ${avgLatency.toFixed(2)} ms\n`,
    );

    // Build dialectic graph and test conflict tracing
    const graph = new Graph({ multi: false, type: "directed" });
    for (const paper of Object.values(CORPUS_PAPERS)) {
      graph.addNode(paper.id, {
        title: paper.title,
        label: paper.title,
        authors: paper.authorsFormatted,
        year: paper.year,
      });
    }

    for (let i = 0; i < classificationResults.length; i++) {
      const res = classificationResults[i];
      if (!graph.hasEdge(res.citingId, res.citedId)) {
        graph.addEdge(res.citingId, res.citedId, {
          edgeType: res.edgeType,
          confidence: Math.round(res.confidence * 100),
          snippet: res.snippet,
          provider: res.provider,
        });
      }
    }

    // Test Dijkstra conflict path tracing from Dong et al. 2021 to Vaswani et al. 2017
    const dongId = CORPUS_PAPERS.P7_DONG_2021.id;
    const vaswaniId = CORPUS_PAPERS.P1_VASWANI_2017.id;

    const conflictPaths = findSemanticPath(
      graph,
      dongId,
      vaswaniId,
      "conflict",
    );

    expect(conflictPaths.length).toBeGreaterThanOrEqual(1);
    console.log("⚡ DIALECTIC CONFLICT PATH (Live AI Grounded):");
    console.log(
      `   • Traced direct contradiction: ${CORPUS_PAPERS.P7_DONG_2021.authorsFormatted} (${CORPUS_PAPERS.P7_DONG_2021.year}) ──[CONTRADICTS]──> ${CORPUS_PAPERS.P1_VASWANI_2017.authorsFormatted} (${CORPUS_PAPERS.P1_VASWANI_2017.year})`,
    );

    // Generate debate matrix
    const matrix = generateDebateMatrixFromGraph(graph, {
      title: "The Transformer Context & Reasoning Controversy (2017–2023)",
      topic:
        "Attention Mechanisms, Context Scaling, and Representation Lineage",
    });

    const contradictsRows = matrix.rows.filter(
      (r) => r.edgeType === "contradicts",
    );
    const extendsRows = matrix.rows.filter((r) => r.edgeType === "extends");
    const supportsRows = matrix.rows.filter((r) => r.edgeType === "supports");
    const citesRows = matrix.rows.filter((r) => r.edgeType === "cites");

    expect(contradictsRows.length).toBeGreaterThanOrEqual(1);
    expect(matrix.rows.length).toBeGreaterThanOrEqual(5);

    console.log("\n📋 LIVE AI DEBATE MATRIX SUMMARY:");
    console.log(`   • Total Synthesized Edges:    ${matrix.rows.length}`);
    console.log(`   • Extending Lines of Work:    ${extendsRows.length}`);
    console.log(`   • Refuting / Critical Works:  ${contradictsRows.length}`);
    console.log(`   • Confirming Replications:    ${supportsRows.length}`);
    console.log(`   • General Background Links:   ${citesRows.length}`);
    console.log(
      "===============================================================================\n",
    );
  }, 120000);
});
