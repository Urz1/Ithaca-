"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { OrganizationRole as PrismaOrganizationRole } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  assignableInvitationRoles,
  assertOwnerSafeguard,
  createInvitationExpiry,
  isInvitationUsable,
  normalizeInvitationEmail,
} from "@/lib/invitation-policy";
import {
  getOrganizationContext,
  listOrganizationsForUser,
  recordAuditEvent,
  requireOrganizationContext,
} from "@/lib/organization-context";
import {
  ACTIVE_ORGANIZATION_COOKIE,
  isValidOrganizationId,
} from "@/lib/organization-selection";
import {
  assertOrganizationPermission,
  assertQuotaAvailable,
  type OrganizationRole,
} from "@/lib/tenancy-policy";
import { headers } from "next/headers";
import { FEATURE_FLAGS } from "@/lib/platform/feature-flags";
import {
  isFeatureEnabledForOrganization,
  setOrganizationRolloutFlag,
} from "@/lib/platform/org-rollout";
import {
  emitProductEventForOrganization,
  PRODUCT_EVENTS,
} from "@/lib/platform/product-events";
import { getOrganizationAiUsage } from "@/lib/platform/ai-usage";
import {
  getPlanEntitlements,
  isEmailAllowedForOrganization,
  isOrganizationPlanId,
  parseEmailDomainList,
  planQuotaFields,
  type OrganizationPlanId,
} from "@/lib/platform/org-plans";
import { sendOrganizationInvitationEmail } from "@/lib/email";

async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.id || !session.user.email) {
    throw new Error("Not authenticated");
  }
  return session.user;
}

export interface OrganizationSummary {
  id: string;
  name: string;
  role: OrganizationRole;
  isActive: boolean;
}

export interface InvitationSummary {
  id: string;
  email: string;
  role: OrganizationRole;
  expiresAt: string;
  acceptedAt?: string;
}

export interface MemberSummary {
  id: string;
  userId: string;
  name: string;
  email: string;
  role: OrganizationRole;
  emailVerified: boolean;
}

export async function getOrganizationSummaries(): Promise<
  OrganizationSummary[]
> {
  const user = await getSessionUser();
  const activeContext = await getOrganizationContext();
  const memberships = await listOrganizationsForUser(user.id);

  return memberships.map((membership) => ({
    id: membership.organizationId,
    name: membership.organization.name,
    role: membership.role,
    isActive: membership.organizationId === activeContext?.organizationId,
  }));
}

export async function setActiveOrganization(
  organizationId: string,
): Promise<void> {
  const user = await getSessionUser();
  const membership = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId: user.id,
      },
    },
  });
  if (!membership) {
    throw new Error("Organization not found");
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  revalidatePath("/", "layout");
}

export interface OrganizationUsageSummary {
  members: number;
  pendingInvitations: number;
  projects: number;
  collections: number;
  savedGraphs: number;
  paperRecords: number;
  aiUsageThisMonth: number;
}

export interface OrganizationPlanAdminSummary {
  plan: OrganizationPlanId;
  label: string;
  description: string;
  priceLabel: string;
  canManagePlan: boolean;
  domainAllowlistEnabled: boolean;
  collaborativeWorkspaces: boolean;
  allowedEmailDomains: string[];
  supportContactEmail: string | null;
  limits: {
    maxMembers: number;
    maxProjects: number;
    maxCollections: number;
    maxSavedGraphs: number;
    maxPaperRecords: number;
    maxAiRequests: number;
    maxApiRequests: number;
  };
  usage: OrganizationUsageSummary;
}

export async function getOrganizationAdminData(): Promise<{
  members: MemberSummary[];
  invitations: InvitationSummary[];
  assignableRoles: OrganizationRole[];
  productAnalyticsEnabled: boolean;
  plan: OrganizationPlanAdminSummary;
  currentUserRole: OrganizationRole;
  currentUserId: string;
}> {
  const context = await requireOrganizationContext("audit:read");
  assertOrganizationPermission(context.role, "members:manage");

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const entitlements = getPlanEntitlements(context.organization.plan);
  const [
    memberships,
    invitations,
    productAnalyticsEnabled,
    projectCount,
    collectionCount,
    savedGraphCount,
    paperRecordCount,
    aiUsageThisMonth,
  ] = await Promise.all([
    prisma.membership.findMany({
      where: { organizationId: context.organizationId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailVerified: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invitation.findMany({
      where: {
        organizationId: context.organizationId,
        acceptedAt: null,
      },
      orderBy: { createdAt: "desc" },
    }),
    isFeatureEnabledForOrganization(
      FEATURE_FLAGS.productAnalytics,
      context.organizationId,
    ),
    prisma.project.count({
      where: { organizationId: context.organizationId },
    }),
    prisma.collection.count({
      where: { organizationId: context.organizationId },
    }),
    prisma.savedGraph.count({
      where: { organizationId: context.organizationId },
    }),
    prisma.paperRecord.count({
      where: { organizationId: context.organizationId },
    }),
    getOrganizationAiUsage(context.organizationId, monthStart),
  ]);

  return {
    members: memberships.map((membership) => ({
      id: membership.id,
      userId: membership.userId,
      name: membership.user.name ?? "Researcher",
      email: membership.user.email,
      role: membership.role,
      emailVerified: membership.user.emailVerified,
    })),
    invitations: invitations.map((invitation) => ({
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
      acceptedAt: invitation.acceptedAt?.toISOString(),
    })),
    assignableRoles: assignableInvitationRoles(context.role),
    productAnalyticsEnabled,
    currentUserRole: context.role,
    currentUserId: context.userId,
    plan: {
      plan: context.organization.plan,
      label: entitlements.label,
      description: entitlements.description,
      priceLabel: entitlements.priceLabel,
      canManagePlan: context.role === "OWNER",
      domainAllowlistEnabled: entitlements.domainAllowlist,
      collaborativeWorkspaces: entitlements.collaborativeWorkspaces,
      allowedEmailDomains: context.organization.allowedEmailDomains,
      supportContactEmail: context.organization.supportContactEmail,
      limits: {
        maxMembers: context.organization.maxMembers,
        maxProjects: context.organization.maxProjects,
        maxCollections: context.organization.maxCollections,
        maxSavedGraphs: context.organization.maxSavedGraphs,
        maxPaperRecords: context.organization.maxPaperRecords,
        maxAiRequests: context.organization.maxAiRequests,
        maxApiRequests: context.organization.maxApiRequests,
      },
      usage: {
        members: memberships.length,
        pendingInvitations: invitations.length,
        projects: projectCount,
        collections: collectionCount,
        savedGraphs: savedGraphCount,
        paperRecords: paperRecordCount,
        aiUsageThisMonth,
      },
    },
  };
}

export async function setOrganizationPlan(
  plan: OrganizationPlanId,
): Promise<void> {
  const context = await requireOrganizationContext("organization:manage");
  if (!isOrganizationPlanId(plan)) {
    throw new Error("Unknown organization plan");
  }

  const entitlements = getPlanEntitlements(plan);
  const quotas = planQuotaFields(plan);

  await prisma.organization.update({
    where: { id: context.organizationId },
    data: {
      ...quotas,
      ...(entitlements.domainAllowlist ? {} : { allowedEmailDomains: [] }),
    },
  });

  await setOrganizationRolloutFlag(
    context.organizationId,
    FEATURE_FLAGS.collaborativeWorkspaces,
    entitlements.collaborativeWorkspaces,
  );

  await recordAuditEvent(context, {
    action: "organization.plan_updated",
    entityType: "Organization",
    entityId: context.organizationId,
    metadata: { plan },
  });
  revalidatePath("/admin");
}

export async function updateOrganizationDomainAllowlist(
  domainsRaw: string,
): Promise<void> {
  const context = await requireOrganizationContext("members:manage");
  const entitlements = getPlanEntitlements(context.organization.plan);
  if (!entitlements.domainAllowlist) {
    throw new Error("Domain allowlists are available on Institution plans");
  }

  const allowedEmailDomains = parseEmailDomainList(domainsRaw);
  await prisma.organization.update({
    where: { id: context.organizationId },
    data: { allowedEmailDomains },
  });

  await recordAuditEvent(context, {
    action: "organization.domains_updated",
    entityType: "Organization",
    entityId: context.organizationId,
    metadata: { allowedEmailDomains },
  });
  revalidatePath("/admin");
}

export async function setOrganizationProductAnalytics(
  enabled: boolean,
): Promise<void> {
  const context = await requireOrganizationContext("audit:read");
  assertOrganizationPermission(context.role, "members:manage");

  await setOrganizationRolloutFlag(
    context.organizationId,
    FEATURE_FLAGS.productAnalytics,
    enabled,
  );
  await recordAuditEvent(context, {
    action: "organization.analytics_updated",
    entityType: "Organization",
    entityId: context.organizationId,
    metadata: { enabled },
  });
  revalidatePath("/admin");
}

export async function exportOrganizationAuditLog(): Promise<{
  exportedAt: string;
  events: Array<{
    id: string;
    action: string;
    entityType: string | null;
    entityId: string | null;
    actorEmail: string | null;
    createdAt: string;
  }>;
}> {
  const context = await requireOrganizationContext("audit:read");
  const events = await prisma.auditEvent.findMany({
    where: { organizationId: context.organizationId },
    include: { actor: { select: { email: true } } },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  await recordAuditEvent(context, {
    action: "audit.exported",
    entityType: "AuditEvent",
    metadata: { count: events.length },
  });

  return {
    exportedAt: new Date().toISOString(),
    events: events.map((event) => ({
      id: event.id,
      action: event.action,
      entityType: event.entityType,
      entityId: event.entityId,
      actorEmail: event.actor?.email ?? null,
      createdAt: event.createdAt.toISOString(),
    })),
  };
}

export async function createOrganizationInvitation(input: {
  email: string;
  role: OrganizationRole;
}): Promise<{ inviteUrl: string; emailSent: boolean }> {
  const context = await requireOrganizationContext("audit:read");
  assertOrganizationPermission(context.role, "members:manage");

  const email = normalizeInvitationEmail(input.email);
  const allowedRoles = assignableInvitationRoles(context.role);
  if (!allowedRoles.includes(input.role)) {
    throw new Error("You cannot assign that role");
  }

  if (
    !isEmailAllowedForOrganization(
      email,
      context.organization.allowedEmailDomains,
    )
  ) {
    throw new Error(
      "That email domain is not allowed for this organization. Update the domain allowlist or invite a permitted address.",
    );
  }

  const [memberCount, existingMember, pendingInvite] = await Promise.all([
    prisma.membership.count({
      where: { organizationId: context.organizationId },
    }),
    prisma.user.findUnique({ where: { email } }),
    prisma.invitation.findFirst({
      where: {
        organizationId: context.organizationId,
        email,
        acceptedAt: null,
      },
    }),
  ]);

  assertQuotaAvailable(
    memberCount + (pendingInvite ? 1 : 0),
    context.organization.maxMembers,
    "member",
  );

  if (
    existingMember &&
    (await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: context.organizationId,
          userId: existingMember.id,
        },
      },
    }))
  ) {
    throw new Error("That user is already a member of this organization");
  }

  const token = crypto.randomUUID().replaceAll("-", "");
  const invitation = await prisma.invitation.upsert({
    where: {
      organizationId_email: {
        organizationId: context.organizationId,
        email,
      },
    },
    update: {
      role: input.role as PrismaOrganizationRole,
      token,
      invitedById: context.userId,
      expiresAt: createInvitationExpiry(),
      acceptedAt: null,
    },
    create: {
      organizationId: context.organizationId,
      email,
      role: input.role as PrismaOrganizationRole,
      token,
      invitedById: context.userId,
      expiresAt: createInvitationExpiry(),
    },
  });

  await recordAuditEvent(context, {
    action: "invitation.created",
    entityType: "invitation",
    entityId: invitation.id,
    metadata: { email, role: input.role },
  });

  await emitProductEventForOrganization(
    {
      name: PRODUCT_EVENTS.memberInvited,
      anonymousId: context.userId,
      properties: { role: input.role },
    },
    context.organizationId,
  );

  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitation.token}`;
  const inviter = await prisma.user.findUnique({
    where: { id: context.userId },
    select: { name: true },
  });
  const emailResult = await sendOrganizationInvitationEmail({
    email,
    inviteUrl,
    organizationName: context.organization.name,
    role: input.role,
    inviterName: inviter?.name,
  });

  return { inviteUrl, emailSent: Boolean(emailResult.success) };
}

export async function updateOrganizationSupportContact(
  email: string,
): Promise<void> {
  const context = await requireOrganizationContext("members:manage");
  const trimmed = email.trim();
  const supportContactEmail = trimmed
    ? normalizeInvitationEmail(trimmed)
    : null;

  if (supportContactEmail && !supportContactEmail.includes("@")) {
    throw new Error("Enter a valid support email address");
  }

  await prisma.organization.update({
    where: { id: context.organizationId },
    data: { supportContactEmail },
  });

  await recordAuditEvent(context, {
    action: "organization.support_contact_updated",
    entityType: "Organization",
    entityId: context.organizationId,
    metadata: { supportContactEmail },
  });
  revalidatePath("/admin");
  revalidatePath("/", "layout");
}

export async function getOrganizationSupportContact(): Promise<string | null> {
  const context = await getOrganizationContext();
  return context?.organization.supportContactEmail ?? null;
}

export async function revokeOrganizationInvitation(
  invitationId: string,
): Promise<void> {
  const context = await requireOrganizationContext("members:manage");
  await prisma.invitation.deleteMany({
    where: {
      id: invitationId,
      organizationId: context.organizationId,
      acceptedAt: null,
    },
  });

  await recordAuditEvent(context, {
    action: "invitation.revoked",
    entityType: "invitation",
    entityId: invitationId,
  });
}

export async function updateOrganizationMemberRole(input: {
  membershipId: string;
  role: OrganizationRole;
}): Promise<void> {
  const context = await requireOrganizationContext("members:manage");
  const allowedRoles = assignableInvitationRoles(context.role);
  if (input.role === "OWNER" && context.role !== "OWNER") {
    throw new Error("Only owners can assign the owner role");
  }
  if (!allowedRoles.includes(input.role) && input.role !== "OWNER") {
    throw new Error("You cannot assign that role");
  }

  const memberships = await prisma.membership.findMany({
    where: { organizationId: context.organizationId },
    select: { userId: true, role: true, id: true },
  });
  const target = memberships.find(
    (membership) => membership.id === input.membershipId,
  );
  if (!target) throw new Error("Member not found");

  if (target.role === "OWNER" && context.role !== "OWNER") {
    throw new Error("Only organization owners can modify an owner's role");
  }
  if (
    target.role === "ADMIN" &&
    context.role !== "OWNER" &&
    target.userId !== context.userId
  ) {
    throw new Error("Only organization owners can modify an administrator's role");
  }

  assertOwnerSafeguard(memberships, target.userId, input.role);

  await prisma.membership.updateMany({
    where: {
      id: input.membershipId,
      organizationId: context.organizationId,
    },
    data: { role: input.role as PrismaOrganizationRole },
  });

  await recordAuditEvent(context, {
    action: "membership.role_updated",
    entityType: "membership",
    entityId: input.membershipId,
    metadata: { role: input.role },
  });
}

export async function removeOrganizationMember(
  membershipId: string,
): Promise<void> {
  const context = await requireOrganizationContext("members:manage");
  const memberships = await prisma.membership.findMany({
    where: { organizationId: context.organizationId },
    select: { userId: true, role: true, id: true },
  });
  const target = memberships.find(
    (membership) => membership.id === membershipId,
  );
  if (!target) throw new Error("Member not found");
  if (target.userId === context.userId) {
    throw new Error("You cannot remove yourself from the organization");
  }

  if (target.role === "OWNER" && context.role !== "OWNER") {
    throw new Error("Only organization owners can remove an owner");
  }
  if (
    target.role === "ADMIN" &&
    context.role !== "OWNER" &&
    target.userId !== context.userId
  ) {
    throw new Error("Only organization owners can remove an administrator");
  }

  assertOwnerSafeguard(memberships, target.userId);

  await prisma.membership.deleteMany({
    where: {
      id: membershipId,
      organizationId: context.organizationId,
    },
  });

  await recordAuditEvent(context, {
    action: "membership.removed",
    entityType: "membership",
    entityId: membershipId,
  });
}

export async function getInvitationByToken(token: string) {
  if (!token) return null;

  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: { organization: true },
  });
  if (!invitation || !isInvitationUsable(invitation)) return null;

  return {
    organizationName: invitation.organization.name,
    email: invitation.email,
    role: invitation.role,
    expiresAt: invitation.expiresAt.toISOString(),
  };
}

export async function acceptOrganizationInvitation(
  token: string,
): Promise<{ organizationId: string }> {
  const user = await getSessionUser();
  const invitation = await prisma.invitation.findUnique({
    where: { token },
  });
  if (!invitation || !isInvitationUsable(invitation)) {
    throw new Error("This invitation is invalid or has expired");
  }
  if (normalizeInvitationEmail(user.email) !== invitation.email) {
    throw new Error("This invitation was sent to a different email address");
  }

  const memberCount = await prisma.membership.count({
    where: { organizationId: invitation.organizationId },
  });
  const organization = await prisma.organization.findUnique({
    where: { id: invitation.organizationId },
  });
  if (!organization) throw new Error("Organization not found");
  assertQuotaAvailable(memberCount, organization.maxMembers, "member");

  await prisma.$transaction([
    prisma.membership.upsert({
      where: {
        organizationId_userId: {
          organizationId: invitation.organizationId,
          userId: user.id,
        },
      },
      update: {
        role: invitation.role,
      },
      create: {
        organizationId: invitation.organizationId,
        userId: user.id,
        role: invitation.role,
      },
    }),
    prisma.invitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: new Date() },
    }),
  ]);

  if (isValidOrganizationId(invitation.organizationId)) {
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORGANIZATION_COOKIE, invitation.organizationId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  await prisma.auditEvent.create({
    data: {
      organizationId: invitation.organizationId,
      actorId: user.id,
      action: "invitation.accepted",
      entityType: "invitation",
      entityId: invitation.id,
      metadata: { email: invitation.email },
    },
  });

  revalidatePath("/", "layout");
  return { organizationId: invitation.organizationId };
}
