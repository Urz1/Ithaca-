import { cookies, headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { OrganizationRole as PrismaOrganizationRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  ACTIVE_ORGANIZATION_COOKIE,
  isValidOrganizationId,
} from "@/lib/organization-selection";
import {
  assertOrganizationPermission,
  type OrganizationPermission,
  type OrganizationRole,
} from "@/lib/tenancy-policy";
import {
  planQuotaFields,
  type OrganizationPlanId,
} from "@/lib/platform/org-plans";

export interface OrganizationContext {
  userId: string;
  organizationId: string;
  role: OrganizationRole;
  organization: {
    id: string;
    name: string;
    slug: string;
    plan: OrganizationPlanId;
    allowedEmailDomains: string[];
    supportContactEmail: string | null;
    maxMembers: number;
    maxProjects: number;
    maxCollections: number;
    maxSavedGraphs: number;
    maxApiRequests: number;
    maxPaperRecords: number;
    maxAiRequests: number;
  };
}

function personalOrganizationName(name: string | null): string {
  return `${name?.trim() || "Personal"}'s Organization`;
}

async function resolveActiveMembership(userId: string) {
  const cookieStore = await cookies();
  const selectedOrganizationId = cookieStore.get(
    ACTIVE_ORGANIZATION_COOKIE,
  )?.value;

  if (isValidOrganizationId(selectedOrganizationId)) {
    const selectedMembership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: selectedOrganizationId,
          userId,
        },
      },
      include: { organization: true },
    });
    if (selectedMembership) return selectedMembership;
  }

  const membership = await prisma.membership.findFirst({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  if (membership) return membership;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true },
  });
  if (!user) return null;

  return prisma.$transaction(async (tx) => {
    const soloQuotas = planQuotaFields("SOLO");
    const organization = await tx.organization.upsert({
      where: { personalOwnerId: userId },
      update: {},
      create: {
        name: personalOrganizationName(user.name),
        slug: `personal-${userId}`,
        personalOwnerId: userId,
        ...soloQuotas,
      },
    });

    return tx.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId: organization.id,
          userId,
        },
      },
      update: {},
      create: {
        organizationId: organization.id,
        userId,
        role: PrismaOrganizationRole.OWNER,
      },
      include: { organization: true },
    });
  });
}

export async function listOrganizationsForUser(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getOrganizationContextForUser(
  userId: string,
): Promise<OrganizationContext | null> {
  const membership = await resolveActiveMembership(userId);
  if (!membership) return null;

  const organization = membership.organization;
  return {
    userId,
    organizationId: membership.organizationId,
    role: membership.role,
    organization: {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      plan: organization.plan,
      allowedEmailDomains: organization.allowedEmailDomains,
      supportContactEmail: organization.supportContactEmail,
      maxMembers: organization.maxMembers,
      maxProjects: organization.maxProjects,
      maxCollections: organization.maxCollections,
      maxSavedGraphs: organization.maxSavedGraphs,
      maxApiRequests: organization.maxApiRequests,
      maxPaperRecords: organization.maxPaperRecords,
      maxAiRequests: organization.maxAiRequests,
    },
  };
}

export async function getOrganizationContext(): Promise<OrganizationContext | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id) return null;
  return getOrganizationContextForUser(session.user.id);
}

export async function requireOrganizationContext(
  permission: OrganizationPermission = "domain:read",
): Promise<OrganizationContext> {
  const context = await getOrganizationContext();
  if (!context) throw new Error("Not authenticated");
  assertOrganizationPermission(context.role, permission);
  return context;
}

export async function recordAuditEvent(
  context: OrganizationContext,
  event: {
    action: string;
    entityType?: string;
    entityId?: string;
    metadata?: Prisma.InputJsonValue;
  },
): Promise<void> {
  await prisma.auditEvent.create({
    data: {
      organizationId: context.organizationId,
      actorId: context.userId,
      ...event,
    },
  });
}
