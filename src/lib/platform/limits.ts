export const PLATFORM_LIMITS = {
  graph: {
    maxNodesInteractive: 10_000,
    maxEdgesInteractive: 50_000,
    maxExpansionDepth: 3,
  },
  imports: {
    maxBytes: 10 * 1024 * 1024,
    maxRecords: 25_000,
  },
  exports: {
    maxNodesSynchronous: 2_000,
    artifactRetentionDays: 30,
  },
  ai: {
    maxChatCharacters: 8_000,
    maxEvidenceCharacters: 20_000,
    maxBatchSize: 50,
  },
} as const;

export type LimitDecision =
  | { allowed: true }
  | { allowed: false; code: "LIMIT_EXCEEDED"; message: string };

export function enforceMaximum(
  value: number,
  maximum: number,
  resource: string,
): LimitDecision {
  if (value <= maximum) return { allowed: true };
  return {
    allowed: false,
    code: "LIMIT_EXCEEDED",
    message: `${resource} exceeds the supported maximum of ${maximum}.`,
  };
}
