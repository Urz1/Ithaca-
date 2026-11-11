import { describe, expect, it, vi } from "vitest";
import {
  classifyChunkWithLLM,
  type ClassificationInput,
} from "../src/lib/api/citation-classifier";
import { POST as classifyRoute } from "../src/app/api/classify/route";
import { NextRequest } from "next/server";

// Load .env
if (typeof process.loadEnvFile === "function") {
  try {
    process.loadEnvFile(".env");
  } catch {}
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    citationCache: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async () => ({})),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
    apiRateLimit: {
      findUnique: vi.fn(async () => null),
      upsert: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
    },
    organization: {
      findFirst: vi.fn(async () => null),
    },
    membership: {
      findFirst: vi.fn(async () => null),
    },
  },
}));

describe("Live Frontier LLM Batch Pipeline with Real Academic Papers", () => {
  const realPapers: ClassificationInput[] = [
    // 1. Brian Sutton-Smith (1966) critiquing Piaget
    {
      citingId: "W_SUTTON_SMITH_1966",
      citedId: "W_PIAGET_2005",
      citingTitle: "Piaget on play: A critique",
      citingAbstract:
        "Piaget's cognitive theory of play is critically evaluated. It is argued that his accommodation-assimilation model fails to account for expressive play, creative divergence, and ludic autonomy.",
      citedTitle: "The Psychology of Intelligence",
      citedAbstract:
        "Piaget examines the operations of intelligence, cognitive schemas, and developmental stages in childhood.",
      targetAuthorSurname: "Piaget",
      citationContexts: [
        "We critique Piaget's formulation of play as mere primacy of assimilation over accommodation.",
      ],
      s2Intents: ["ResultComparison"],
    },

    // 2. Elizabeth R. Hinde (2007) - Instrumental Attribution Fallacy Test
    {
      citingId: "W_HINDE_2007",
      citedId: "W_PIAGET_2005",
      citingTitle:
        "The Early Years of the Arizona Social Studies Standards: A Case Study of Reform",
      citingAbstract:
        "Examines the struggle over elementary social studies content standards and how curriculum specialists navigated state mandates.",
      citedTitle: "The Psychology of Intelligence",
      citedAbstract:
        "Piaget examines the operations of intelligence, cognitive schemas, and developmental stages in childhood.",
      targetAuthorSurname: "Piaget",
      citationContexts: [
        "Educators used Piaget's developmental theories to refute state curriculum standards that demanded abstract historical analysis in kindergarten.",
      ],
      s2Intents: ["Background"],
    },

    // 3. Wagenmakers et al. (2011) - Null Hypothesis Refutation of Bem (2011)
    {
      citingId: "W_WAGENMAKERS_2011",
      citedId: "W_BEM_2011",
      citingTitle:
        "Why psychologists must change the way they analyze their data: A Bayesian analysis of Bem (2011)",
      citingAbstract:
        "We re-analyze the evidence presented by Bem using default Bayesian hypothesis tests for directional research questions. Across all 9 experiments, the Bayesian analysis indicates that the data either support the null hypothesis or yield inconclusive evidence.",
      citedTitle:
        "Feeling the future: Experimental evidence for anomalous retroactive influences on cognition and affect",
      citedAbstract:
        "Nine experiments involving more than 1,000 participants test for anomalous retroactive influences on cognitive and affective performance.",
      targetAuthorSurname: "Bem",
      citationContexts: [
        "Our Bayesian re-analysis indicates that Bem's data yield no evidence for precognition and instead support the null hypothesis of no anomalous effect.",
      ],
      s2Intents: ["ResultComparison"],
    },

    // 4. Ritchie, Wiseman & French (2012) - Replication Failure of Bem (2011)
    {
      citingId: "W_RITCHIE_2012",
      citedId: "W_BEM_2011",
      citingTitle:
        "Failing the Future: Three Unsuccessful Attempts to Replicate Bem's Retroactive Facilitation of Recall",
      citingAbstract:
        "In three pre-registered experiments with 150 participants, we attempted to replicate Experiment 9 of Bem (2011). None of the three experiments produced significant evidence for retroactive facilitation.",
      citedTitle:
        "Feeling the future: Experimental evidence for anomalous retroactive influences on cognition and affect",
      citedAbstract:
        "Nine experiments test for anomalous retroactive influence on cognition.",
      targetAuthorSurname: "Bem",
      citationContexts: [
        "Across three independent pre-registered replication attempts, we failed to replicate Bem's retroactive recall facilitation effect (p = .63, p = .84, p = .72).",
      ],
      s2Intents: ["ResultComparison"],
    },

    // 5. Vaswani et al. (2017) extending Bahdanau et al. (2014)
    {
      citingId: "W_VASWANI_2017",
      citedId: "W_BAHDANAU_2014",
      citingTitle: "Attention Is All You Need",
      citingAbstract:
        "We propose the Transformer, a model architecture eschewing recurrence and instead relying entirely on an attention mechanism to draw global dependencies between input and output.",
      citedTitle:
        "Neural Machine Translation by Jointly Learning to Align and Translate",
      citedAbstract:
        "We conjecture that the use of a fixed-length vector is a bottleneck and introduce an extension allowing a model to automatically search for parts of a source sentence.",
      targetAuthorSurname: "Bahdanau",
      citationContexts: [
        "The Transformer generalizes the attention mechanism of Bahdanau et al. to dispense with recurrence completely.",
      ],
      s2Intents: ["Methodology", "ResultComparison"],
    },
  ];

  it("classifies real papers in a single live batch call with accurate epistemic grounding", async () => {
    const t0 = performance.now();
    const results = await classifyChunkWithLLM(realPapers);
    const latency = performance.now() - t0;

    console.log("\n=======================================================");
    console.log(`🚀 LIVE LLM BATCH RESPONSE (5 Real Papers in 1 Call)`);
    console.log(`Latency: ${latency.toFixed(2)} ms`);
    console.log(`Provider: ${results[0]?.provider}`);
    console.log("=======================================================");

    results.forEach((res, i) => {
      console.log(`\n[${i + 1}] Citing: "${realPapers[i].citingTitle}"`);
      console.log(`    Cited:  "${realPapers[i].citedTitle}"`);
      console.log(`    Stance: ${res.edgeType.toUpperCase()}`);
      console.log(`    Confidence: ${(res.confidence * 100).toFixed(0)}%`);
      console.log(`    Directness Tier: ${res.directnessTier ?? "N/A"}`);
      console.log(`    Snippet: "${res.snippet}"`);
    });

    // 1. Sutton-Smith explicitly critiques Piaget -> must be "contradicts"
    const suttonSmith = results[0];
    expect(suttonSmith.edgeType).toBe("contradicts");
    expect(suttonSmith.confidence).toBeGreaterThanOrEqual(0.8);
    expect(suttonSmith.provider).toContain("groq");

    // 2. Hinde uses Piaget instrumentally to refute curriculum -> must NOT be "contradicts"
    const hinde = results[1];
    expect(hinde.edgeType).not.toBe("contradicts");

    // 3. Wagenmakers Bayes null hypothesis refutation -> must be "contradicts"
    const wagenmakers = results[2];
    expect(wagenmakers.edgeType).toBe("contradicts");
    expect(wagenmakers.confidence).toBeGreaterThanOrEqual(0.8);

    // 4. Ritchie failure to replicate Bem -> must be "contradicts"
    const ritchie = results[3];
    expect(ritchie.edgeType).toBe("contradicts");
    expect(ritchie.confidence).toBeGreaterThanOrEqual(0.85);

    // 5. Vaswani extends Bahdanau attention -> must be "extends" or "supports"
    const vaswani = results[4];
    expect(["extends", "supports"]).toContain(vaswani.edgeType);
  }, 45000);

  it("verifies unauthenticated guest exploration on /api/classify succeeds without 401", async () => {
    const req = new NextRequest("http://localhost:3000/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        citations: [
          {
            citingId: "W_RITCHIE_2012",
            citedId: "W_BEM_2011",
            citingTitle:
              "Failing the Future: Three Unsuccessful Attempts to Replicate Bem's Retroactive Facilitation of Recall",
            citingAbstract: "Three pre-registered failure to replicate experiments.",
            citedTitle: "Feeling the future",
            citedAbstract: "Original study.",
            citationContexts: [
              "We failed to replicate Bem's retroactive recall facilitation effect.",
            ],
            s2Intents: ["ResultComparison"],
          },
        ],
      }),
    });

    const res = await classifyRoute(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].edgeType).toBe("contradicts");
    expect(body.results[0].provider).toContain("groq");
  }, 30000);
});
