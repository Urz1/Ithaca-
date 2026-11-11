import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { ClassificationMetrics } from "../../src/modules/ai/provenance";

export interface LiveEvalReport {
  kind: "ithaca-classifier-live-eval";
  generatedAt: string;
  sampleCount: number;
  metrics: ClassificationMetrics;
  thresholds: {
    accuracy: number;
    macroPrecision: number;
    macroRecall: number;
  };
  passed: boolean;
  mismatches: Array<{
    id: string;
    expected: string;
    predicted: string;
    provider: string;
  }>;
}

export function writeLiveEvalReport(
  report: LiveEvalReport,
  directory = join(process.cwd(), "eval", "reports"),
): string {
  mkdirSync(directory, { recursive: true });
  const timestamp = report.generatedAt.replace(/[:.]/g, "-");
  const datedPath = join(directory, `classifier-live-${timestamp}.json`);
  const latestPath = join(directory, "classifier-live-latest.json");
  const payload = `${JSON.stringify(report, null, 2)}\n`;
  writeFileSync(datedPath, payload);
  writeFileSync(latestPath, payload);
  return latestPath;
}
