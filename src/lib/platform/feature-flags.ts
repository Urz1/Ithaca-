export const FEATURE_FLAGS = {
  collaborativeWorkspaces: "collaborative-workspaces",
  durableJobs: "durable-jobs",
  aiClassification: "ai-classification",
  aiChat: "ai-chat",
  aiSummaries: "ai-summaries",
  publicSharing: "public-sharing",
  productAnalytics: "product-analytics",
} as const;

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];

const DEFAULTS: Record<FeatureFlag, boolean> = {
  "collaborative-workspaces": false,
  "durable-jobs": false,
  "ai-classification": true,
  "ai-chat": true,
  "ai-summaries": true,
  "public-sharing": false,
  "product-analytics": true,
};

function envKey(flag: FeatureFlag): string {
  return `FEATURE_${flag.replaceAll("-", "_").toUpperCase()}`;
}

export function isFeatureEnabled(
  flag: FeatureFlag,
  environment: Record<string, string | undefined> = process.env,
): boolean {
  const value = environment[envKey(flag)];
  if (value === undefined) return DEFAULTS[flag];
  return value === "1" || value.toLowerCase() === "true";
}
