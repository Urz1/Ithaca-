import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  calculateRetryDelay,
  canRetry,
  createIdempotencyKey,
  DEFAULT_RETRY_POLICY,
  JOB_TYPES,
} from "@/modules/jobs/job-policy";
import { enqueueJob, type JobEnvelope } from "@/modules/jobs/queue";
import { processJobLocally } from "@/modules/jobs/local-runner";
import * as jobService from "@/modules/jobs/job-service";
import * as graphExportHandler from "@/modules/jobs/handlers/graph-export";
import * as nadreHarvestHandler from "@/modules/jobs/handlers/nadre-harvest";

describe("Phase 2: Background Jobs & Worker Queue Resilience", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("Job Policy & Exponential Backoff with Jitter", () => {
    it("generates deterministic idempotency keys partitioned by organization and job type", () => {
      const key1 = createIdempotencyKey(
        "org_123",
        JOB_TYPES.graphExport,
        "hash_abc",
      );
      const key2 = createIdempotencyKey(
        "org_123",
        JOB_TYPES.graphExport,
        "hash_abc",
      );
      const keyOtherOrg = createIdempotencyKey(
        "org_456",
        JOB_TYPES.graphExport,
        "hash_abc",
      );

      expect(key1).toBe("org_123:graph_export:hash_abc");
      expect(key1).toBe(key2);
      expect(key1).not.toBe(keyOtherOrg);
    });

    it("calculates exponential retry delays bounded by policy and jitter", () => {
      // Deterministic random generator = 0.5 (jitter factor = 0.75)
      const mockRandom = () => 0.5;

      const delay1 = calculateRetryDelay(1, DEFAULT_RETRY_POLICY, mockRandom);
      const delay2 = calculateRetryDelay(2, DEFAULT_RETRY_POLICY, mockRandom);
      const delay3 = calculateRetryDelay(3, DEFAULT_RETRY_POLICY, mockRandom);
      const delayLarge = calculateRetryDelay(
        10,
        DEFAULT_RETRY_POLICY,
        mockRandom,
      );

      // Attempt 1: 1000 * 2^0 * 0.75 = 750ms
      expect(delay1).toBe(750);
      // Attempt 2: 1000 * 2^1 * 0.75 = 1500ms
      expect(delay2).toBe(1500);
      // Attempt 3: 1000 * 2^2 * 0.75 = 3000ms
      expect(delay3).toBe(3000);
      // Bounded by maxDelayMs (60,000 * 0.75 = 45,000ms)
      expect(delayLarge).toBe(45000);
    });

    it("enforces dead-letter terminal condition when max attempts are exceeded", () => {
      expect(canRetry(1, DEFAULT_RETRY_POLICY)).toBe(true);
      expect(canRetry(4, DEFAULT_RETRY_POLICY)).toBe(true);
      expect(canRetry(5, DEFAULT_RETRY_POLICY)).toBe(false);
      expect(canRetry(6, DEFAULT_RETRY_POLICY)).toBe(false);
    });
  });

  describe("Queue Enqueueing & Autonomous Local Runner", () => {
    it("enqueues jobs to local in-process runner when cloud queue is unconfigured", async () => {
      const envelope: JobEnvelope<{ jobId: string; filename: string }> = {
        id: "test_job_001",
        type: JOB_TYPES.graphExport,
        organizationId: "org_alpha",
        requestedByUserId: "user_001",
        requestedAt: new Date().toISOString(),
        payload: {
          jobId: "test_job_001",
          filename: "transformer_debate_export.csv",
        },
      };

      const result = await enqueueJob(envelope);
      expect(result.messageId).toBe("local_test_job_001");
    });

    it("dispatches graphExport jobs to the appropriate domain handler", async () => {
      const exportSpy = vi
        .spyOn(graphExportHandler, "processGraphExportJob")
        .mockResolvedValue({
          artifactUrl: "https://storage.ithaca.science/artifacts/export.json",
          artifactId: "art_99",
        });

      const envelope: JobEnvelope<{
        jobId: string;
        artifactId: string;
        filename: string;
        content: string;
        contentType: string;
        encoding: "utf-8" | "base64";
      }> = {
        id: "job_export_99",
        type: JOB_TYPES.graphExport,
        organizationId: "org_test",
        requestedByUserId: "user_test",
        requestedAt: new Date().toISOString(),
        payload: {
          jobId: "job_export_99",
          artifactId: "art_123",
          filename: "controversy_matrix.csv",
          content: "source,target,stance\nVaswani,Dong,contradicts",
          contentType: "text/csv",
          encoding: "utf-8",
        },
      };

      await processJobLocally(envelope);

      expect(exportSpy).toHaveBeenCalledTimes(1);
      expect(exportSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          jobId: "job_export_99",
          filename: "controversy_matrix.csv",
          contentType: "text/csv",
        }),
      );
    });

    it("absorbs handler exceptions and records failure state via markBackgroundJobFailed", async () => {
      vi.spyOn(nadreHarvestHandler, "processNadreHarvestJob").mockRejectedValue(
        new Error("NADRE repository connection timeout [ETIMEDOUT]"),
      );

      const failSpy = vi
        .spyOn(jobService, "markBackgroundJobFailed")
        .mockResolvedValue({} as never);

      const envelope: JobEnvelope<{ jobId: string; repositorySlug: string }> = {
        id: "job_harvest_fail",
        type: JOB_TYPES.nadreHarvest,
        organizationId: "org_ethiopia",
        requestedByUserId: "user_sovereign",
        requestedAt: new Date().toISOString(),
        payload: {
          jobId: "job_harvest_fail",
          repositorySlug: "aau-institutional-repository",
        },
      };

      // Ensure processJobLocally does NOT throw an unhandled exception
      await expect(processJobLocally(envelope)).resolves.not.toThrow();

      expect(failSpy).toHaveBeenCalledWith(
        "job_harvest_fail",
        expect.stringContaining("NADRE repository connection timeout"),
      );
    });
  });
});
