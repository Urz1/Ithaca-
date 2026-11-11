import type { OrganizationRole } from "@/lib/tenancy-policy";

export const INVITATION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export interface MembershipSnapshot {
  userId: string;
  role: OrganizationRole;
}

export function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createInvitationExpiry(from = new Date()): Date {
  return new Date(from.getTime() + INVITATION_TTL_MS);
}

export function isInvitationExpired(
  expiresAt: Date,
  now = new Date(),
): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export function isInvitationUsable(options: {
  acceptedAt: Date | null;
  expiresAt: Date;
  now?: Date;
}): boolean {
  return (
    !options.acceptedAt && !isInvitationExpired(options.expiresAt, options.now)
  );
}

export function countOwners(memberships: MembershipSnapshot[]): number {
  return memberships.filter((membership) => membership.role === "OWNER").length;
}

export function canRemoveOrDemoteMember(options: {
  memberships: MembershipSnapshot[];
  targetUserId: string;
  nextRole?: OrganizationRole;
}): boolean {
  const target = options.memberships.find(
    (membership) => membership.userId === options.targetUserId,
  );
  if (!target) return false;
  if (target.role !== "OWNER") return true;

  const ownerCount = countOwners(options.memberships);
  if (ownerCount > 1) return true;
  return options.nextRole === "OWNER";
}

export function assertOwnerSafeguard(
  memberships: MembershipSnapshot[],
  targetUserId: string,
  nextRole?: OrganizationRole,
): void {
  if (!canRemoveOrDemoteMember({ memberships, targetUserId, nextRole })) {
    throw new Error("Cannot remove or demote the last organization owner");
  }
}

export function assignableInvitationRoles(
  actorRole: OrganizationRole,
): OrganizationRole[] {
  if (actorRole === "OWNER") {
    return ["ADMIN", "MEMBER", "VIEWER"];
  }
  if (actorRole === "ADMIN") {
    return ["MEMBER", "VIEWER"];
  }
  return [];
}
