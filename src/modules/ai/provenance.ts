import { z } from "zod";

export const citationRelationSchema = z.enum([
  "supports",
  "contradicts",
  "extends",
  "cites",
]);

export const aiProvenanceSchema = z.object({
  provider: z.string().min(1),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
  classifierVersion: z.number().int().positive(),
  generatedAt: z.string().datetime(),
  sourceIds: z.array(z.string().min(1)).min(1),
  evidence: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
  humanReviewed: z.boolean().default(false),
  reviewerId: z.string().min(1).optional(),
});

export type AiProvenance = z.infer<typeof aiProvenanceSchema>;

export interface EvaluationExample {
  expected: z.infer<typeof citationRelationSchema>;
  predicted: z.infer<typeof citationRelationSchema>;
}

export interface ClassificationMetrics {
  accuracy: number;
  macroPrecision: number;
  macroRecall: number;
  sampleCount: number;
}

export function calculateClassificationMetrics(
  examples: EvaluationExample[],
): ClassificationMetrics {
  if (examples.length === 0) {
    return {
      accuracy: 0,
      macroPrecision: 0,
      macroRecall: 0,
      sampleCount: 0,
    };
  }

  const labels = citationRelationSchema.options;
  let precisionTotal = 0;
  let recallTotal = 0;

  for (const label of labels) {
    let truePositive = 0;
    let falsePositive = 0;
    let falseNegative = 0;

    for (const example of examples) {
      if (example.predicted === label && example.expected === label)
        truePositive++;
      if (example.predicted === label && example.expected !== label)
        falsePositive++;
      if (example.predicted !== label && example.expected === label)
        falseNegative++;
    }

    precisionTotal +=
      truePositive === 0 ? 0 : truePositive / (truePositive + falsePositive);
    recallTotal +=
      truePositive === 0 ? 0 : truePositive / (truePositive + falseNegative);
  }

  return {
    accuracy:
      examples.filter((example) => example.expected === example.predicted)
        .length / examples.length,
    macroPrecision: precisionTotal / labels.length,
    macroRecall: recallTotal / labels.length,
    sampleCount: examples.length,
  };
}

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+|any\s+|the\s+)?(previous\s+)?(instructions|guidelines|directions|commands|prompts)/i,
  /(system|developer|admin)\s+(instruction|prompt|message)\s*:/i,
  /(system|developer|instruction)\s+override/i,
  /reveal\s+(your|the)\s+(secret|key|instructions|system\s+prompt)/i,
  /call\s+(a|the)\s+tool/i,
  /always\s+output\s+json\s*:/i,
];

export function containsPromptInjectionRisk(text: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(text));
}

export const CLASSIFIER_PROMPT_VERSION = "citation-classifier-v7";
export const CHAT_PROMPT_VERSION = "canvas-chat-v2";
export const SUMMARY_PROMPT_VERSION = "paper-summary-v2";

export function buildAiProvenance(input: {
  provider: string;
  model: string;
  promptVersion: string;
  classifierVersion?: number;
  sourceIds: string[];
  evidence: string[];
  confidence: number;
  humanReviewed?: boolean;
  reviewerId?: string;
}): AiProvenance {
  return aiProvenanceSchema.parse({
    provider: input.provider,
    model: input.model,
    promptVersion: input.promptVersion,
    classifierVersion: input.classifierVersion ?? 1,
    generatedAt: new Date().toISOString(),
    sourceIds: input.sourceIds,
    evidence: input.evidence,
    confidence: input.confidence,
    humanReviewed: input.humanReviewed ?? false,
    reviewerId: input.reviewerId,
  });
}
