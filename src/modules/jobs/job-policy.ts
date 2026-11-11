export const JOB_TYPES = {
  graphExpansion: "graph_expansion",
  metadataReconciliation: "metadata_reconciliation",
  citationClassification: "citation_classification",
  paperSummary: "paper_summary",
  graphExport: "graph_export",
  notification: "notification",
  savedSearchAlert: "saved_search_alert",
  nadreHarvest: "nadre_harvest",
} as const;

export type JobType = (typeof JOB_TYPES)[keyof typeof JOB_TYPES];

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 5,
  baseDelayMs: 1_000,
  maxDelayMs: 60_000,
};

export function calculateRetryDelay(
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  random: () => number = Math.random,
): number {
  const boundedAttempt = Math.max(1, attempt);
  const exponential = Math.min(
    policy.maxDelayMs,
    policy.baseDelayMs * 2 ** (boundedAttempt - 1),
  );
  const jitter = 0.5 + random() * 0.5;
  return Math.round(exponential * jitter);
}

export function canRetry(
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
): boolean {
  return attempt < policy.maxAttempts;
}

export function createIdempotencyKey(
  organizationId: string,
  jobType: JobType,
  inputFingerprint: string,
): string {
  return `${organizationId}:${jobType}:${inputFingerprint}`;
}
