import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import "@/test/integration/mock-auth";
import {
  canRunIntegrationTests,
  disconnectTestDatabase,
  getTestPrisma,
  resetDatabase,
} from "./db";
import {
  createTestMembership,
  createTestOrganization,
  createTestUser,
} from "./factories";
import {
  clearAuthMocks,
  setMockOrganizationCookie,
  setMockSession,
} from "./mock-auth";

const emailSpy = vi.hoisted(() => vi.fn().mockResolvedValue({ success: true }));

vi.mock("@/lib/email", () => ({
  sendOrganizationInvitationEmail: emailSpy,
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

const run = canRunIntegrationTests();

describe.runIf(run)("invite lifecycle", () => {
  beforeEach(async () => {
    await resetDatabase();
    clearAuthMocks();
    emailSpy.mockClear();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("creates an invitation email with accept URL and accepts for matching email", async () => {
    const owner = await createTestUser({ email: "owner@lab.edu" });
    const org = await createTestOrganization({ name: "Pilot Lab" });
    await createTestMembership({
      user: owner,
      organization: org,
      role: "OWNER",
    });

    setMockSession(owner);
    setMockOrganizationCookie(org.id);

    const { createOrganizationInvitation, acceptOrganizationInvitation } =
      await import("@/app/(app)/admin/actions");

    const created = await createOrganizationInvitation({
      email: "researcher@lab.edu",
      role: "MEMBER",
    });

    expect(created.inviteUrl).toContain("/invite/");
    expect(created.emailSent).toBe(true);
    expect(emailSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "researcher@lab.edu",
        organizationName: "Pilot Lab",
        inviteUrl: created.inviteUrl,
      }),
    );

    const token = created.inviteUrl.split("/invite/")[1];
    const invitee = await createTestUser({ email: "researcher@lab.edu" });
    setMockSession(invitee);
    setMockOrganizationCookie(null);

    const accepted = await acceptOrganizationInvitation(token);
    expect(accepted.organizationId).toBe(org.id);

    const prisma = getTestPrisma();
    const membership = await prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId: org.id,
          userId: invitee.id,
        },
      },
    });
    expect(membership?.role).toBe("MEMBER");
  });

  it("rejects acceptance when session email does not match invitation", async () => {
    const owner = await createTestUser({ email: "owner@lab.edu" });
    const org = await createTestOrganization();
    await createTestMembership({
      user: owner,
      organization: org,
      role: "OWNER",
    });

    setMockSession(owner);
    setMockOrganizationCookie(org.id);

    const { createOrganizationInvitation, acceptOrganizationInvitation } =
      await import("@/app/(app)/admin/actions");

    const created = await createOrganizationInvitation({
      email: "invited@lab.edu",
      role: "MEMBER",
    });
    const token = created.inviteUrl.split("/invite/")[1];

    const wrongUser = await createTestUser({ email: "wrong@lab.edu" });
    setMockSession(wrongUser);

    await expect(acceptOrganizationInvitation(token)).rejects.toThrow(
      /different email/i,
    );
  });

  it("blocks invites outside institution domain allowlist", async () => {
    const owner = await createTestUser({ email: "admin@university.edu" });
    const org = await createTestOrganization({
      plan: "INSTITUTION",
      allowedEmailDomains: ["university.edu"],
    });
    await createTestMembership({
      user: owner,
      organization: org,
      role: "OWNER",
    });

    setMockSession(owner);
    setMockOrganizationCookie(org.id);

    const { createOrganizationInvitation } =
      await import("@/app/(app)/admin/actions");

    await expect(
      createOrganizationInvitation({
        email: "person@gmail.com",
        role: "MEMBER",
      }),
    ).rejects.toThrow(/domain is not allowed/i);
  });
});
