import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canRunIntegrationTests,
  disconnectTestDatabase,
  resetDatabase,
} from "./db";
import {
  createTestCollection,
  createTestMembership,
  createTestOrganization,
  createTestUser,
} from "./factories";
import { buildRequest } from "./request";
import { POST as postCronDigest } from "@/app/api/cron/collection-digest/route";

const run = canRunIntegrationTests();

describe.runIf(run)("cron collection digest", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.stubEnv("CRON_SECRET", "test-cron-secret-for-integration-tests");
  });

  afterAll(async () => {
    await disconnectTestDatabase();
    vi.unstubAllEnvs();
  });

  it("rejects requests without a valid cron secret", async () => {
    const response = await postCronDigest(
      buildRequest("/api/cron/collection-digest", { method: "POST" }),
    );
    expect(response.status).toBe(401);
  });

  it("rejects requests with the wrong cron secret", async () => {
    const response = await postCronDigest(
      buildRequest("/api/cron/collection-digest", {
        method: "POST",
        headers: { authorization: "Bearer wrong-secret" },
      }),
    );
    expect(response.status).toBe(401);
  });

  it("scopes digest fan-out to watched collections for one organization", async () => {
    const ownerA = await createTestUser({ email: "digest-a@lab.edu" });
    const ownerB = await createTestUser({ email: "digest-b@college.edu" });
    const orgA = await createTestOrganization({ name: "Digest Lab A" });
    const orgB = await createTestOrganization({ name: "Digest Lab B" });
    await createTestMembership({
      user: ownerA,
      organization: orgA,
      role: "OWNER",
    });
    await createTestMembership({
      user: ownerB,
      organization: orgB,
      role: "OWNER",
    });

    await createTestCollection({
      user: ownerA,
      organization: orgA,
      title: "Watched A",
      watchEnabled: true,
    });
    await createTestCollection({
      user: ownerB,
      organization: orgB,
      title: "Unwatched B",
      watchEnabled: false,
    });

    const response = await postCronDigest(
      buildRequest("/api/cron/collection-digest", {
        method: "POST",
        headers: {
          authorization: "Bearer test-cron-secret-for-integration-tests",
        },
        searchParams: { organizationId: orgA.id },
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.organizations).toBe(1);
    expect(payload.results[0].organizationId).toBe(orgA.id);
  });
});
