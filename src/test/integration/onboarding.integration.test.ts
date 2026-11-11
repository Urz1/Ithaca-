import { afterAll, beforeEach, describe, expect, it } from "vitest";
import "@/test/integration/mock-auth";
import {
  canRunIntegrationTests,
  disconnectTestDatabase,
  getTestPrisma,
  resetDatabase,
} from "./db";
import { createTestUser } from "./factories";
import { clearAuthMocks, setMockSession } from "./mock-auth";
import {
  completeOnboarding,
  needsOnboarding,
} from "@/app/(app)/onboarding/actions";

const run = canRunIntegrationTests();

describe.runIf(run)("onboarding literacy", () => {
  beforeEach(async () => {
    await resetDatabase();
    clearAuthMocks();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("requires onboarding for new users and persists completion", async () => {
    const user = await createTestUser({
      email: `onboarding-${Date.now()}@lab.edu`,
    });
    setMockSession(user);

    expect(await needsOnboarding()).toBe(true);

    await completeOnboarding();

    expect(await needsOnboarding()).toBe(false);

    const prisma = getTestPrisma();
    const saved = await prisma.user.findUnique({
      where: { id: user.id },
      select: { hasCompletedOnboarding: true },
    });
    expect(saved?.hasCompletedOnboarding).toBe(true);
  });

  it("does not require onboarding for users who already completed it", async () => {
    const user = await createTestUser({
      email: `returning-${Date.now()}@lab.edu`,
    });
    const prisma = getTestPrisma();
    await prisma.user.update({
      where: { id: user.id },
      data: { hasCompletedOnboarding: true },
    });

    setMockSession(user);
    expect(await needsOnboarding()).toBe(false);
  });
});
