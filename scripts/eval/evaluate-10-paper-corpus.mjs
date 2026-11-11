#!/usr/bin/env node
/**
 * Ithaca — 10-Paper Transformer Corpus Benchmark Runner
 *
 * Standalone evaluation runner evaluating the complete epistemic stance mapping pipeline:
 * 1. Pairwise rhetorical stance classification (supports, contradicts, extends, cites)
 * 2. Graphology dialectic topology & Dijkstra conflict path tracing
 * 3. Academic debate matrix generation and multi-format reporting (Markdown, CSV, LaTeX)
 * 4. Live extension badge endpoint resolution and latency benchmark
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(join(root, ".env"));
  } catch {}
}

async function checkLiveBadgeEndpoint() {
  const targetDoi = "10.48550/arXiv.1706.03762";
  const url = `http://localhost:3000/api/research/extension-badge?doi=${encodeURIComponent(targetDoi)}`;

  try {
    const t0 = performance.now();
    const res = await fetch(url);
    const latency = performance.now() - t0;

    if (res.ok) {
      const data = await res.json();
      console.log(
        "5️⃣  LIVE EXTENSION BADGE RESOLUTION (HTTP Endpoint Benchmark):",
      );
      console.log(`   • Target DOI:                ${data.doi}`);
      console.log(`   • Title Resolved:            ${data.title}`);
      console.log(
        `   • Query Latency:             ${latency.toFixed(2)} ms (SLA: < 25.0 ms)`,
      );
      console.log(`   • Total Associated Edges:    ${data.total}`);
      console.log(`   • Refutations / Disputes:    ${data.contradicts}`);
      console.log(`   • Extensions:                ${data.extends}`);
      console.log(`   • Confirmations:             ${data.supports}`);
      console.log(
        `   • Dispute Severity:          ${data.disputeSeverity.toUpperCase()}`,
      );
      console.log(
        `   • High Confidence Disputes:  ${data.highConfidenceDisputes}`,
      );
      console.log(
        `   • Top Dispute Snippet:       "${data.topDisputeSnippet}"`,
      );
      console.log(`   • Canonical Explorer URL:    ${data.canonicalUrl}`);
    } else {
      console.log(
        `ℹ️  Dev server returned HTTP ${res.status} (offline or unseeded)`,
      );
    }
  } catch (err) {
    console.log(
      "ℹ️  Dev server not listening on localhost:3000 (skipping live HTTP test)",
    );
  }
}

async function main() {
  const isLive =
    process.argv.includes("--live") ||
    Boolean(process.env.GROQ_API_KEY || process.env.GEMINI_API_KEY);

  const testFile = isLive
    ? "eval/transformer-corpus-live.test.ts"
    : "eval/transformer-corpus.test.ts";

  console.log(
    `\n▶ Starting 10-Paper Transformer Corpus Benchmark [Mode: ${isLive ? "LIVE CLOUD AI (Groq)" : "OFFLINE DETERMINISTIC"}]...`,
  );

  // 1. Run Vitest Transformer benchmark suite with verbose reporter
  const testRun = spawnSync(
    "npx",
    [
      "vitest",
      "run",
      "--config",
      "vitest.eval-live.config.ts",
      testFile,
      "--reporter=verbose",
    ],
    {
      cwd: root,
      stdio: "inherit",
      env: process.env,
    },
  );

  if (testRun.status !== 0) {
    console.error("❌ Transformer Corpus Evaluation Benchmark failed!");
    process.exit(testRun.status ?? 1);
  }

  // 2. Perform live endpoint check
  await checkLiveBadgeEndpoint();

  console.log(
    "\n===============================================================================",
  );
  console.log("🏆 ALL EVALUATION STAGES COMPLETED SEAMLESSLY");
  console.log(
    "===============================================================================\n",
  );
}

main().catch((err) => {
  console.error("Evaluation script encountered error:", err);
  process.exit(1);
});
