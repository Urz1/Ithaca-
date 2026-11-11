import { prisma } from "@/lib/prisma";
import { AuthorizationError } from "@/lib/tenancy-policy";

export interface AiUsageInput {
  organizationId: string;
  userId: string;
  operation: string;
  provider: string;
  model: string;
  inputText?: string;
  outputText?: string;
}

function estimateUnits(text?: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export async function getOrganizationAiUsage(
  organizationId: string,
  since: Date,
): Promise<number> {
  const aggregate = await prisma.aiUsageRecord.aggregate({
    where: {
      organizationId,
      createdAt: { gte: since },
    },
    _sum: {
      inputUnits: true,
      outputUnits: true,
    },
  });

  return (aggregate._sum.inputUnits ?? 0) + (aggregate._sum.outputUnits ?? 0);
}

export async function assertAiBudgetAvailable(
  organizationId: string,
  maximum: number,
  projectedUnits = 1,
): Promise<void> {
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const used = await getOrganizationAiUsage(organizationId, monthStart);
  if (used + projectedUnits > maximum) {
    throw new AuthorizationError("Organization AI usage budget exceeded");
  }
}

export async function recordAiUsage(input: AiUsageInput): Promise<void> {
  await prisma.aiUsageRecord.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      operation: input.operation,
      provider: input.provider,
      model: input.model,
      inputUnits: estimateUnits(input.inputText),
      outputUnits: estimateUnits(input.outputText),
    },
  });
}
