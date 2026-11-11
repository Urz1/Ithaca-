import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  calculateClassificationMetrics,
  type EvaluationExample,
} from "../src/modules/ai/provenance";

const datasetPath = resolve(
  process.cwd(),
  "eval/datasets/classifier-baseline.json",
);
const examples = JSON.parse(
  readFileSync(datasetPath, "utf8"),
) as EvaluationExample[];

describe("classifier baseline dataset", () => {
  it("meets minimum quality thresholds", () => {
    const metrics = calculateClassificationMetrics(examples);
    expect(metrics.sampleCount).toBeGreaterThan(0);
    expect(metrics.accuracy).toBeGreaterThanOrEqual(0.8);
    expect(metrics.macroPrecision).toBeGreaterThanOrEqual(0.75);
    expect(metrics.macroRecall).toBeGreaterThanOrEqual(0.75);
  });
});
