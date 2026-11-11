import type { FeatureFlag } from "@/lib/platform/feature-flags";
import { isFeatureEnabled } from "@/lib/platform/feature-flags";
import { prisma } from "@/lib/prisma";

function parseRolloutFlags(
  value: unknown,
): Partial<Record<FeatureFlag, boolean>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Partial<Record<FeatureFlag, boolean>>;
}

export async function isFeatureEnabledForOrganization(
  flag: FeatureFlag,
  organizationId?: string | null,
): Promise<boolean> {
  if (!organizationId) {
    return isFeatureEnabled(flag);
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { rolloutFlags: true },
  });
  const rollout = parseRolloutFlags(organization?.rolloutFlags);
  if (rollout[flag] !== undefined) {
    return rollout[flag] === true;
  }

  return isFeatureEnabled(flag);
}

export async function setOrganizationRolloutFlag(
  organizationId: string,
  flag: FeatureFlag,
  enabled: boolean,
): Promise<void> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { rolloutFlags: true },
  });
  const rollout = parseRolloutFlags(organization?.rolloutFlags);
  rollout[flag] = enabled;

  await prisma.organization.update({
    where: { id: organizationId },
    data: { rolloutFlags: rollout },
  });
}
