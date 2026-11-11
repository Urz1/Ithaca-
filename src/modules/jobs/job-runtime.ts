import { isFeatureEnabled, FEATURE_FLAGS } from "@/lib/platform/feature-flags";
import { PLATFORM_LIMITS } from "@/lib/platform/limits";

export function isDurableJobsConfigured(
  environment: Record<string, string | undefined> = process.env,
): boolean {
  return Boolean(
    environment.QSTASH_TOKEN &&
    environment.QSTASH_CURRENT_SIGNING_KEY &&
    environment.QSTASH_NEXT_SIGNING_KEY &&
    environment.NEXT_PUBLIC_APP_URL &&
    environment.BLOB_READ_WRITE_TOKEN,
  );
}

export function isDurableJobsEnabled(
  environment: Record<string, string | undefined> = process.env,
): boolean {
  return (
    isFeatureEnabled(FEATURE_FLAGS.durableJobs, environment) &&
    isDurableJobsConfigured(environment)
  );
}

export function shouldUseDurableGraphExport(
  nodeCount: number,
  environment: Record<string, string | undefined> = process.env,
): boolean {
  if (!isDurableJobsEnabled(environment)) return false;
  return nodeCount > PLATFORM_LIMITS.exports.maxNodesSynchronous;
}

export function artifactExpiryDate(
  from = new Date(),
  environment: Record<string, string | undefined> = process.env,
): Date {
  const retentionDays = PLATFORM_LIMITS.exports.artifactRetentionDays;
  return new Date(from.getTime() + retentionDays * 24 * 60 * 60 * 1000);
}
