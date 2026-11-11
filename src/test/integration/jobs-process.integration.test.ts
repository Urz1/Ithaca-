import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  canRunIntegrationTests,
  disconnectTestDatabase,
  resetDatabase,
} from "./db";
import { buildRequest } from "./request";
import { POST as postJobProcess } from "@/app/api/jobs/process/route";
import { JOB_TYPES } from "@/modules/jobs/job-policy";

const verifySpy = vi.hoisted(() => vi.fn());
const digestSpy = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ emailsSent: 0, collections: 0 }),
);

vi.mock("@/modules/jobs/queue", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/jobs/queue")>();
  return {
    ...actual,
    verifyJobSignature: verifySpy,
  };
});

vi.mock("@/modules/jobs/handlers/collection-digest", () => ({
  processCollectionDigestJob: digestSpy,
}));

const run = canRunIntegrationTests();

describe.runIf(run)("jobs process gate", () => {
  beforeEach(async () => {
    await resetDatabase();
    verifySpy.mockReset();
    digestSpy.mockClear();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  it("rejects unsigned job payloads", async () => {
    verifySpy.mockResolvedValue(false);

    const response = await postJobProcess(
      buildRequest("/api/jobs/process", {
        method: "POST",
        headers: { "upstash-signature": "invalid" },
        body: { type: "noop" },
      }),
    );

    expect(response.status).toBe(401);
    expect(digestSpy).not.toHaveBeenCalled();
  });

  it("dispatches digest jobs only for the signed organization payload", async () => {
    verifySpy.mockResolvedValue(true);

    const body = {
      id: "job-envelope-1",
      type: JOB_TYPES.savedSearchAlert,
      organizationId: "org-digest-123",
      requestedByUserId: "user-123",
      requestedAt: new Date().toISOString(),
      payload: {
        jobId: "background-job-123",
        collectionIds: ["collection-1"],
      },
    };

    const response = await postJobProcess(
      buildRequest("/api/jobs/process", {
        method: "POST",
        headers: { "upstash-signature": "valid-signature" },
        body,
      }),
    );

    expect(response.status).toBe(200);
    expect(digestSpy).toHaveBeenCalledWith({
      jobId: "background-job-123",
      organizationId: "org-digest-123",
      collectionIds: ["collection-1"],
    });
  });
});
