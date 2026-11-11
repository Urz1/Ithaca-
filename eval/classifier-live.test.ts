import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  calculateClassificationMetrics,
  type EvaluationExample,
} from "../src/modules/ai/provenance";
import {
  classifyBatch,
  type ClassificationInput,
} from "../src/lib/api/citation-classifier";
import { writeLiveEvalReport } from "./helpers/live-eval-report";

interface LiveEvalCase {
  id: string;
  expected: EvaluationExample["expected"];
  input: ClassificationInput;
}

const datasetPath = resolve(
  process.cwd(),
  "eval/datasets/classifier-live.json",
);
const cases = JSON.parse(readFileSync(datasetPath, "utf8")) as LiveEvalCase[];

const LIVE_THRESHOLDS = {
  accuracy: 0.65,
  macroPrecision: 0.6,
  macroRecall: 0.6,
};

function hasLiveProviderConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY);
}

function normalizePrediction(edgeType: string): EvaluationExample["expected"] {
  if (edgeType === "unknown") return "cites";
  return edgeType as EvaluationExample["expected"];
}

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

const run =
  process.env.RUN_LIVE_CLASSIFIER_EVAL === "1" && hasLiveProviderConfigured();

describe.runIf(run)("live classifier eval", () => {
  afterAll(() => {
    vi.clearAllMocks();
  });

  it("classifies labeled pairs with a real provider and records regression metrics", async () => {
    expect(cases.length).toBeGreaterThanOrEqual(30);

    const results = await classifyBatch(
      cases.map((example) => example.input),
      2,
    );

    const examples: EvaluationExample[] = [];
    const mismatches: Array<{
      id: string;
      expected: string;
      predicted: string;
      provider: string;
    }> = [];

    for (let index = 0; index < cases.length; index += 1) {
      const testCase = cases[index];
      const result = results[index];
      const predicted = normalizePrediction(result.edgeType);
      examples.push({ expected: testCase.expected, predicted });
      if (predicted !== testCase.expected) {
        mismatches.push({
          id: testCase.id,
          expected: testCase.expected,
          predicted,
          provider: result.provider,
        });
      }
    }

    const metrics = calculateClassificationMetrics(examples);
    const passed =
      metrics.accuracy >= LIVE_THRESHOLDS.accuracy &&
      metrics.macroPrecision >= LIVE_THRESHOLDS.macroPrecision &&
      metrics.macroRecall >= LIVE_THRESHOLDS.macroRecall;

    const reportPath = writeLiveEvalReport({
      kind: "ithaca-classifier-live-eval",
      generatedAt: new Date().toISOString(),
      sampleCount: metrics.sampleCount,
      metrics,
      thresholds: LIVE_THRESHOLDS,
      passed,
      mismatches,
    });

    console.log(
      JSON.stringify(
        {
          type: "classifier_live_eval",
          reportPath,
          passed,
          metrics,
          mismatchCount: mismatches.length,
        },
        null,
        2,
      ),
    );

    expect(metrics.sampleCount).toBeGreaterThanOrEqual(30);
    expect(metrics.accuracy).toBeGreaterThanOrEqual(LIVE_THRESHOLDS.accuracy);
    expect(metrics.macroPrecision).toBeGreaterThanOrEqual(
      LIVE_THRESHOLDS.macroPrecision,
    );
    expect(metrics.macroRecall).toBeGreaterThanOrEqual(
      LIVE_THRESHOLDS.macroRecall,
    );
  }, 600_000);
});

describe.runIf(process.env.RUN_LIVE_CLASSIFIER_EVAL === "1")(
  "live classifier eval prerequisites",
  () => {
    it("requires a configured LLM provider key", () => {
      expect(hasLiveProviderConfigured()).toBe(true);
    });
  },
);
