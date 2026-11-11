export type OrganizationRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";

export type OrganizationPermission =
  | "domain:read"
  | "domain:write"
  | "members:manage"
  | "organization:manage"
  | "audit:read";

const ROLE_PERMISSIONS: Record<
  OrganizationRole,
  ReadonlySet<OrganizationPermission>
> = {
  OWNER: new Set([
    "domain:read",
    "domain:write",
    "members:manage",
    "organization:manage",
    "audit:read",
  ]),
  ADMIN: new Set([
    "domain:read",
    "domain:write",
    "members:manage",
    "audit:read",
  ]),
  MEMBER: new Set(["domain:read", "domain:write"]),
  VIEWER: new Set(["domain:read"]),
};

export class AuthorizationError extends Error {
  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export function hasOrganizationPermission(
  role: OrganizationRole,
  permission: OrganizationPermission,
): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function assertOrganizationPermission(
  role: OrganizationRole,
  permission: OrganizationPermission,
): void {
  if (!hasOrganizationPermission(role, permission)) {
    throw new AuthorizationError();
  }
}

export function scopeToOrganization<T extends Record<string, unknown>>(
  organizationId: string,
  where?: T,
): Omit<T, "organizationId"> & { organizationId: string } {
  return {
    ...where,
    organizationId,
  } as Omit<T, "organizationId"> & { organizationId: string };
}

export function isQuotaAvailable(current: number, maximum: number): boolean {
  return current < maximum;
}

export function assertQuotaAvailable(
  current: number,
  maximum: number,
  resource: string,
): void {
  if (!isQuotaAvailable(current, maximum)) {
    throw new AuthorizationError(`Organization ${resource} quota exceeded`);
  }
}
