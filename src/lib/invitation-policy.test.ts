import { describe, expect, it } from "vitest";
import {
  assertOwnerSafeguard,
  assignableInvitationRoles,
  canRemoveOrDemoteMember,
  createInvitationExpiry,
  isInvitationUsable,
  normalizeInvitationEmail,
} from "./invitation-policy";

describe("invitation policy", () => {
  it("normalizes invitation emails", () => {
    expect(normalizeInvitationEmail(" Researcher@Example.com ")).toBe(
      "researcher@example.com",
    );
  });

  it("creates a seven-day invitation expiry", () => {
    const from = new Date("2026-07-24T12:00:00.000Z");
    expect(createInvitationExpiry(from).toISOString()).toBe(
      "2026-07-31T12:00:00.000Z",
    );
  });

  it("rejects expired or accepted invitations", () => {
    expect(
      isInvitationUsable({
        acceptedAt: null,
        expiresAt: new Date("2026-07-25T00:00:00.000Z"),
        now: new Date("2026-07-24T00:00:00.000Z"),
      }),
    ).toBe(true);
    expect(
      isInvitationUsable({
        acceptedAt: new Date(),
        expiresAt: new Date("2026-07-25T00:00:00.000Z"),
      }),
    ).toBe(false);
  });

  it("protects the last owner from demotion or removal", () => {
    const memberships = [{ userId: "owner-1", role: "OWNER" as const }];

    expect(
      canRemoveOrDemoteMember({
        memberships,
        targetUserId: "owner-1",
        nextRole: "ADMIN",
      }),
    ).toBe(false);
    expect(() => assertOwnerSafeguard(memberships, "owner-1", "ADMIN")).toThrow(
      /last organization owner/i,
    );
  });

  it("limits assignable invitation roles by actor role", () => {
    expect(assignableInvitationRoles("OWNER")).toEqual([
      "ADMIN",
      "MEMBER",
      "VIEWER",
    ]);
    expect(assignableInvitationRoles("ADMIN")).toEqual(["MEMBER", "VIEWER"]);
    expect(assignableInvitationRoles("MEMBER")).toEqual([]);
  });
});
