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
import { assertAiBudgetAvailable } from "@/lib/platform/ai-usage";
import { AuthorizationError } from "@/lib/tenancy-policy";

vi.mock("@/lib/email", () => ({
  sendOrganizationInvitationEmail: vi.fn().mockResolvedValue({ success: true }),
  sendEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

const run = canRunIntegrationTests();

describe.runIf(run)("plan quotas", () => {
  beforeEach(async () => {
    await resetDatabase();
    clearAuthMocks();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("blocks invites when the organization seat quota is exhausted", async () => {
    const owner = await createTestUser({ email: "owner@lab.edu" });
    const member = await createTestUser({ email: "member@lab.edu" });
    const org = await createTestOrganization({ maxMembers: 1 });
    await createTestMembership({
      user: owner,
      organization: org,
      role: "OWNER",
    });
    await createTestMembership({
      user: member,
      organization: org,
      role: "MEMBER",
    });

    setMockSession(owner);
    setMockOrganizationCookie(org.id);

    const { createOrganizationInvitation } =
      await import("@/app/(app)/admin/actions");

    await expect(
      createOrganizationInvitation({
        email: "new-person@lab.edu",
        role: "MEMBER",
      }),
    ).rejects.toThrow(/quota exceeded/i);
  });

  it("rejects AI usage when the monthly budget is exceeded", async () => {
    const user = await createTestUser();
    const org = await createTestOrganization({ plan: "SOLO" });
    await createTestMembership({ user, organization: org, role: "OWNER" });

    const prisma = getTestPrisma();
    await prisma.aiUsageRecord.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        operation: "classify",
        provider: "test",
        model: "test-model",
        inputUnits: 1500,
        outputUnits: 600,
      },
    });

    await expect(
      assertAiBudgetAvailable(org.id, 2000, 1),
    ).rejects.toBeInstanceOf(AuthorizationError);
  });
});
