import { describe, expect, it } from "vitest";
import {
  artifactExpiryDate,
  isDurableJobsConfigured,
  isDurableJobsEnabled,
  shouldUseDurableGraphExport,
} from "./job-runtime";
import { PLATFORM_LIMITS } from "@/lib/platform/limits";

describe("job-runtime", () => {
  it("requires feature flag and infrastructure for durable jobs", () => {
    expect(
      isDurableJobsEnabled({
        FEATURE_DURABLE_JOBS: "true",
        QSTASH_TOKEN: "token",
        QSTASH_CURRENT_SIGNING_KEY: "current",
        QSTASH_NEXT_SIGNING_KEY: "next",
        NEXT_PUBLIC_APP_URL: "https://app.example.com",
        BLOB_READ_WRITE_TOKEN: "blob",
      }),
    ).toBe(true);
    expect(
      isDurableJobsEnabled({
        FEATURE_DURABLE_JOBS: "false",
        QSTASH_TOKEN: "token",
        QSTASH_CURRENT_SIGNING_KEY: "current",
        QSTASH_NEXT_SIGNING_KEY: "next",
        NEXT_PUBLIC_APP_URL: "https://app.example.com",
        BLOB_READ_WRITE_TOKEN: "blob",
      }),
    ).toBe(false);
  });

  it("detects missing infrastructure", () => {
    expect(isDurableJobsConfigured({})).toBe(false);
  });

  it("routes large exports through the queue threshold", () => {
    expect(
      shouldUseDurableGraphExport(PLATFORM_LIMITS.exports.maxNodesSynchronous, {
        FEATURE_DURABLE_JOBS: "true",
        QSTASH_TOKEN: "token",
        QSTASH_CURRENT_SIGNING_KEY: "current",
        QSTASH_NEXT_SIGNING_KEY: "next",
        NEXT_PUBLIC_APP_URL: "https://app.example.com",
        BLOB_READ_WRITE_TOKEN: "blob",
      }),
    ).toBe(false);
    expect(
      shouldUseDurableGraphExport(
        PLATFORM_LIMITS.exports.maxNodesSynchronous + 1,
        {
          FEATURE_DURABLE_JOBS: "true",
          QSTASH_TOKEN: "token",
          QSTASH_CURRENT_SIGNING_KEY: "current",
          QSTASH_NEXT_SIGNING_KEY: "next",
          NEXT_PUBLIC_APP_URL: "https://app.example.com",
          BLOB_READ_WRITE_TOKEN: "blob",
        },
      ),
    ).toBe(true);
  });

  it("computes artifact expiry from retention policy", () => {
    const start = new Date("2026-07-24T12:00:00.000Z");
    const expiry = artifactExpiryDate(start);
    expect(expiry.toISOString()).toBe("2026-08-23T12:00:00.000Z");
  });
});
