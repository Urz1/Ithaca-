import { describe, expect, it } from "vitest";
import {
  buildAiProvenance,
  calculateClassificationMetrics,
} from "./provenance";

describe("buildAiProvenance", () => {
  it("validates required provenance fields", () => {
    const provenance = buildAiProvenance({
      provider: "gemini",
      model: "gemini-2.0-flash",
      promptVersion: "canvas-chat-v2",
      sourceIds: ["W123"],
      evidence: ["What supports this claim?"],
      confidence: 0.8,
    });

    expect(provenance.humanReviewed).toBe(false);
    expect(provenance.provider).toBe("gemini");
  });
});

describe("calculateClassificationMetrics", () => {
  it("meets baseline dataset quality threshold", () => {
    const metrics = calculateClassificationMetrics([
      { expected: "supports", predicted: "supports" },
      { expected: "contradicts", predicted: "contradicts" },
      { expected: "extends", predicted: "extends" },
      { expected: "cites", predicted: "cites" },
      { expected: "supports", predicted: "cites" },
    ]);

    expect(metrics.accuracy).toBe(0.8);
    expect(metrics.sampleCount).toBe(5);
  });
});
