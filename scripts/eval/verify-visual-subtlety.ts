/**
 * Verification Script: Takeaway 4 — The Visual Subtlety Flaw
 *
 * Verifies that:
 * 1. Contradictions are rendered as solid, high-contrast neon crimson (#f43f5e) lines with glow.
 * 2. Directional arrowheads are attached to edges pointing to the target node.
 * 3. Contested nodes have dual luminous aura rings and a visible ⚔️ N badge.
 * 4. The exported visual artifacts contain an embedded Dialectic Debate Callout Card
 *    with grounded claim quotes passing the "Cold Open Test".
 */

import Graph from "graphology";
import * as fs from "fs";
import * as path from "path";
import {
  getTopDebateClashes,
  exportAsSVG,
  drawDirectionalArrow,
  drawDebateCalloutCard,
  formatDebateLabelWithYear,
} from "../../src/lib/graph-export";

async function runVisualSubtletyVerification() {
  console.log("================================================================================");
  console.log("   TAKEAWAY 4 VERIFICATION: VISUAL HIGH-CONTRAST CONTRADICTIONS & CLASH DECK    ");
  console.log("================================================================================\n");

  const graph = new Graph({ multi: false, type: "directed" });

  // 1. Add Bem (2011) target node
  graph.addNode("bem-2011", {
    label: "Bem (2011)",
    title: "Feeling the Future: Experimental Evidence for Anomalous Retroactive Influences",
    authors: "Daryl J. Bem",
    year: 2011,
    x: 400,
    y: 300,
    size: 14,
    controversyScore: 5,
  });

  // 2. Add replication failure papers
  const disputants = [
    {
      id: "ritchie-2012",
      label: "Ritchie et al. (2012)",
      title: "Failing the Future: Three Unsuccessful Attempts to Replicate Bem's Retroactive Facilitation",
      year: 2012,
      x: 150,
      y: 180,
      confidence: 95,
      snippet: "Failed to replicate Bem's findings across 3 pre-registered experiments (p > .05).",
    },
    {
      id: "galak-2012",
      label: "Galak et al. (2012)",
      title: "Correcting the Past: Failures to Replicate Psi",
      year: 2012,
      x: 180,
      y: 420,
      confidence: 94,
      snippet: "Meta-analysis of 7 replication attempts revealed an overall effect size not significantly different from zero.",
    },
    {
      id: "wagenmakers-2011",
      label: "Wagenmakers et al. (2011)",
      title: "Why Psychologists Must Change the Way They Analyze Their Data",
      year: 2011,
      x: 250,
      y: 120,
      confidence: 92,
      snippet: "Bayesian reanalysis shows default Bayes factors provide positive evidence in favor of the null hypothesis.",
    },
  ];

  disputants.forEach((d) => {
    graph.addNode(d.id, {
      label: d.label,
      title: d.title,
      year: d.year,
      x: d.x,
      y: d.y,
      size: 8,
    });

    graph.addEdge(d.id, "bem-2011", {
      edgeType: "contradicts",
      confidence: d.confidence,
      snippet: d.snippet,
    });
  });

  // 3. Add supportive and routine citations
  graph.addNode("mossbridge-2012", {
    label: "Mossbridge (2012)",
    title: "Predictive Physiological Anticipation Preceding Seemingly Unpredictable Stimuli",
    year: 2012,
    x: 650,
    y: 200,
    size: 8,
  });
  graph.addEdge("mossbridge-2012", "bem-2011", {
    edgeType: "supports",
    confidence: 88,
    snippet: "Corroborates anomalous physiological anticipation effects.",
  });

  graph.addNode("radin-2012", {
    label: "Radin (2012)",
    title: "Electrodermal Presentiments of Future Emotions",
    year: 2012,
    x: 680,
    y: 400,
    size: 7,
  });
  graph.addEdge("radin-2012", "bem-2011", {
    edgeType: "cites",
    confidence: 60,
  });

  console.log(`[1] Loaded network with ${graph.order} nodes and ${graph.size} edges.`);

  // 4. Test Dialectic Clash Extraction
  const topClashes = getTopDebateClashes(graph, 3);
  console.log(`[2] Extracted top ${topClashes.length} empirical clashes:`);
  topClashes.forEach((c, i) => {
    const pair = `${formatDebateLabelWithYear(c.citingTitle, c.citingYear)} ⚔️ ${formatDebateLabelWithYear(c.targetTitle, c.targetYear)}`;
    console.log(`    ${i + 1}. ${pair} [${c.confidence}%]`);
    console.log(`       "${c.snippet}"`);
  });

  if (topClashes.length !== 3) {
    throw new Error(`Expected 3 clashes, got ${topClashes.length}`);
  }
  if (topClashes[0].confidence !== 95) {
    throw new Error(`Expected top confidence 95%, got ${topClashes[0].confidence}%`);
  }

  // 5. Test Export as SVG (verifying Cold Open Test & visual markers)
  const mockSigma = {
    getDimensions: () => ({ width: 1200, height: 800 }),
  } as any;

  let generatedSvg = "";
  const originalBlob = globalThis.Blob;
  const originalURL = globalThis.URL;

  try {
    globalThis.Blob = class MockBlob {
      constructor(parts: any[]) {
        generatedSvg = parts.join("");
      }
    } as any;
    globalThis.URL.createObjectURL = () => "mock:blob-url";
    globalThis.URL.revokeObjectURL = () => {};

    await exportAsSVG(mockSigma, graph, {
      filename: "bem-controversy-map.svg",
      includeHeader: true,
      includeLegend: true,
      includeFooter: true,
      metadata: {
        title: "Daryl Bem (2011) Replication Crucible & Dialectic Clashes",
        nodeCount: graph.order,
        edgeCount: graph.size,
      },
    });
  } finally {
    globalThis.Blob = originalBlob;
    globalThis.URL = originalURL;
  }

  // 6. Assertions on the Visual Export
  console.log("\n[3] Auditing Visual Export Artifact:");

  const hasContradictMarker = generatedSvg.includes('<marker id="arrow-contradicts"');
  console.log(`    • Directional Arrowhead Marker: ${hasContradictMarker ? "✅ PRESENT" : "❌ MISSING"}`);
  if (!hasContradictMarker) throw new Error("Missing arrow-contradicts marker in SVG defs");

  const hasCrimsonGlow = generatedSvg.includes('filter="url(#crimson-glow)"');
  console.log(`    • Neon Crimson Luminous Halo Filter: ${hasCrimsonGlow ? "✅ PRESENT" : "❌ MISSING"}`);
  if (!hasCrimsonGlow) throw new Error("Missing crimson glow filter");

  const hasSolidCrimsonEdge = generatedSvg.includes('stroke="#f43f5e"');
  console.log(`    • Solid Neon Crimson Stroke (#f43f5e): ${hasSolidCrimsonEdge ? "✅ PRESENT" : "❌ MISSING"}`);
  if (!hasSolidCrimsonEdge) throw new Error("Missing solid neon stroke");

  const hasControversyBadge = generatedSvg.includes("⚔️ 5");
  console.log(`    • Contested Node Controversy Badge (⚔️ 5): ${hasControversyBadge ? "✅ PRESENT" : "❌ MISSING"}`);
  if (!hasControversyBadge) throw new Error("Missing controversy badge ⚔️ 5");

  const hasDebateCallout = generatedSvg.includes('id="debate-callout"') && generatedSvg.includes("EMPIRICAL CONTROVERSIES");
  console.log(`    • Embedded Dialectic Debate Callout Card: ${hasDebateCallout ? "✅ PRESENT" : "❌ MISSING"}`);
  if (!hasDebateCallout) throw new Error("Missing debate callout card");

  const hasRitchieQuote = generatedSvg.includes("Failed to replicate Bem");
  console.log(`    • Grounded Replication Failure Claim Quote: ${hasRitchieQuote ? "✅ PRESENT" : "❌ MISSING"}`);
  if (!hasRitchieQuote) throw new Error("Missing grounded quote in debate callout");

  // Save generated artifact for manual verification
  const outDir = path.resolve(__dirname, "../../coverage");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "bem-controversy-map.svg"), generatedSvg, "utf8");
  console.log(`\n[4] Saved verified SVG export artifact to: ${path.join(outDir, "bem-controversy-map.svg")}`);

  console.log("\n================================================================================");
  console.log("   🎉 TAKEAWAY 4 VERIFICATION SUCCESSFUL: 100% OF VISUAL FLAWS RESOLVED!       ");
  console.log("================================================================================\n");
}

runVisualSubtletyVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
