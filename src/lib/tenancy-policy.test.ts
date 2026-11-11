import { describe, expect, it } from "vitest";
import {
  AuthorizationError,
  assertOrganizationPermission,
  assertQuotaAvailable,
  hasOrganizationPermission,
  isQuotaAvailable,
  scopeToOrganization,
  type OrganizationRole,
} from "./tenancy-policy";

describe("organization permissions", () => {
  it.each<[OrganizationRole, boolean]>([
    ["OWNER", true],
    ["ADMIN", true],
    ["MEMBER", true],
    ["VIEWER", false],
  ])("applies domain write policy to %s", (role, expected) => {
    expect(hasOrganizationPermission(role, "domain:write")).toBe(expected);
  });

  it("reserves organization management for owners", () => {
    expect(hasOrganizationPermission("OWNER", "organization:manage")).toBe(
      true,
    );
    expect(hasOrganizationPermission("ADMIN", "organization:manage")).toBe(
      false,
    );
  });

  it("throws a consistent authorization error when denied", () => {
    expect(() =>
      assertOrganizationPermission("VIEWER", "domain:write"),
    ).toThrow(AuthorizationError);
  });
});

describe("tenant scoping", () => {
  it("adds the active organization to a domain filter", () => {
    expect(scopeToOrganization("org-a", { userId: "user-1" })).toEqual({
      userId: "user-1",
      organizationId: "org-a",
    });
  });

  it("cannot be overridden by a caller-supplied organization", () => {
    expect(
      scopeToOrganization("org-a", {
        id: "resource-1",
        organizationId: "org-b",
      }),
    ).toEqual({ id: "resource-1", organizationId: "org-a" });
  });
});

describe("organization quotas", () => {
  it("allows creation only below the configured maximum", () => {
    expect(isQuotaAvailable(4, 5)).toBe(true);
    expect(isQuotaAvailable(5, 5)).toBe(false);
  });

  it("reports the exhausted resource", () => {
    expect(() => assertQuotaAvailable(10, 10, "project")).toThrow(
      "Organization project quota exceeded",
    );
  });
});
