/**
 * Verification Script for Multi-Strata Epistemic Sampling (MSES)
 * Tests Bem (2011) to confirm that direct critiques and replications
 * are properly prioritized in the graph.
 */

import { OpenAlexProvider } from "../../src/lib/api/openalex-provider";
import { getDebateCitingWorks } from "../../src/lib/api/openalex-client";

async function verifyMSES() {
  console.log("===============================================================================");
  console.log("🧪 VERIFYING MULTI-STRATA EPISTEMIC SAMPLING (MSES)");
  console.log("===============================================================================");

  const bemId = "W2118699776"; // Bem (2011)

  // Step 1: Direct test of getDebateCitingWorks
  console.log("\n1️⃣  Testing getDebateCitingWorks(paperId, { authorSurname: 'Bem', limit: 15 })...");
  const citingWorks = await getDebateCitingWorks(bemId, {
    authorSurname: "Bem",
    limit: 15,
  });

  console.log(`   Retrieved ${citingWorks.length} citing works via MSES:`);
  let hasNamedCritique = false;
  let hasReplication = false;

  citingWorks.forEach((w, idx) => {
    const title = w.title ?? "";
    const isNamed = title.toLowerCase().includes("bem");
    const isRep = /replicate|replication|fail|critique|comment/i.test(title);
    if (isNamed) hasNamedCritique = true;
    if (isRep) hasReplication = true;

    const badge = isNamed
      ? "🎯 NAMED CRITIQUE"
      : isRep
        ? "⚔️ REPLICATION/DEBATE"
        : "📄 EXTENSION";

    console.log(`   ${(idx + 1).toString().padStart(2)}. [${badge}] "${w.title}" (${w.publication_year}) - ${w.cited_by_count} cites`);
  });

  console.log(`\n   ✓ Contains direct named critiques (e.g. Wagenmakers, Galak): ${hasNamedCritique ? "YES ✅" : "NO ❌"}`);
  console.log(`   ✓ Contains replication / debate studies: ${hasReplication ? "YES ✅" : "NO ❌"}`);

  // Step 2: Test full OpenAlexProvider.fetchPaperContext
  console.log("\n2️⃣  Testing full OpenAlexProvider.fetchPaperContext (25 nodes total)...");
  const provider = new OpenAlexProvider({
    classifyEdges: true,
    progressiveHydration: false,
  });

  const t0 = performance.now();
  const graphData = await provider.fetchPaperContext(bemId, 25);
  const elapsed = (performance.now() - t0).toFixed(0);

  console.log(`   Graph generated in ${elapsed} ms:`);
  console.log(`   • Total Nodes: ${graphData.nodes.length}`);
  console.log(`   • Total Edges: ${graphData.edges.length}`);

  const edgeTypeCounts: Record<string, number> = {};
  graphData.edges.forEach((e) => {
    edgeTypeCounts[e.edgeType] = (edgeTypeCounts[e.edgeType] || 0) + 1;
  });

  console.log("\n   📊 Edge Breakdown in the New Graph:");
  for (const [type, count] of Object.entries(edgeTypeCounts)) {
    console.log(`     - ${type.toUpperCase()}: ${count} edges (${((count / graphData.edges.length) * 100).toFixed(1)}%)`);
  }

  // Check if non-cites debate edges exist and are well-represented
  const debateEdges = (edgeTypeCounts.contradicts || 0) + (edgeTypeCounts.extends || 0) + (edgeTypeCounts.supports || 0);
  console.log(`\n   ✓ Total Active Debate Edges (Supports/Contradicts/Extends): ${debateEdges} (${((debateEdges / graphData.edges.length) * 100).toFixed(1)}%)`);

  if (!hasNamedCritique || !hasReplication) {
    throw new Error("MSES failed: did not retrieve named critiques or replications!");
  }

  console.log("\n🎉 MULTI-STRATA EPISTEMIC SAMPLING VERIFICATION SUCCESSFUL!");
}

verifyMSES().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
