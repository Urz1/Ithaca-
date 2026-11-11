import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  calculateClassificationMetrics,
  type EvaluationExample,
} from "../src/modules/ai/provenance";
import {
  classifyBatchLocally,
  type LocalStanceAnalysis,
} from "../src/lib/api/local-classifier";
import type { ClassificationInput } from "../src/lib/api/citation-classifier";

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

const LOCAL_THRESHOLDS = {
  accuracy: 0.7,
  macroPrecision: 0.65,
  macroRecall: 0.65,
};

describe("TC-EVAL-01: Offline Local Classifier Benchmark", () => {
  it("evaluates real academic test corpus with zero API calls and meets quality thresholds", () => {
    expect(cases.length).toBeGreaterThanOrEqual(30);

    const start = performance.now();
    const results = classifyBatchLocally(cases.map((c) => c.input));
    const elapsedMs = performance.now() - start;

    const examples: EvaluationExample[] = [];
    const mismatches: Array<{
      id: string;
      expected: string;
      predicted: string;
      contexts?: string[];
    }> = [];

    for (let i = 0; i < cases.length; i++) {
      const testCase = cases[i];
      const result = results[i];
      const predicted = (
        result.edgeType === "unknown" ? "cites" : result.edgeType
      ) as EvaluationExample["expected"];

      examples.push({ expected: testCase.expected, predicted });
      if (predicted !== testCase.expected) {
        mismatches.push({
          id: testCase.id,
          expected: testCase.expected,
          predicted,
          contexts: testCase.input.citationContexts,
        });
      }
    }

    const metrics = calculateClassificationMetrics(examples);

    console.log(
      JSON.stringify(
        {
          type: "offline_local_classifier_benchmark",
          sampleCount: metrics.sampleCount,
          accuracy: metrics.accuracy,
          macroPrecision: metrics.macroPrecision,
          macroRecall: metrics.macroRecall,
          mismatchCount: mismatches.length,
          totalTimeMs: elapsedMs,
          avgTimePerPairMs: elapsedMs / cases.length,
        },
        null,
        2,
      ),
    );

    expect(metrics.sampleCount).toBe(cases.length);
    expect(metrics.accuracy).toBeGreaterThanOrEqual(LOCAL_THRESHOLDS.accuracy);
    expect(metrics.macroPrecision).toBeGreaterThanOrEqual(
      LOCAL_THRESHOLDS.macroPrecision,
    );
    expect(metrics.macroRecall).toBeGreaterThanOrEqual(
      LOCAL_THRESHOLDS.macroRecall,
    );
  });
});
