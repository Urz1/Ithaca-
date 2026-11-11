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
import { buildRequest } from "./request";

const run = canRunIntegrationTests();

describe.runIf(run)(
  "Citation Calibration & Fine-Tuning Dataset API Integration",
  () => {
    beforeEach(async () => {
      await resetDatabase();
      clearAuthMocks();
      vi.unstubAllEnvs();
    });

    afterAll(async () => {
      await disconnectTestDatabase();
    });

    describe("TC-CORR-02: Authentication & Validation", () => {
      it("rejects unauthenticated POST requests", async () => {
        const { POST } = await import("@/app/api/classify/correct/route");
        const request = buildRequest("http://localhost/api/classify/correct", {
          method: "POST",
          body: {
            citingId: "W100",
            citedId: "W200",
            edgeType: "contradicts",
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(401);
        const body = await response.json();
        expect(body.code).toBe("AUTHENTICATION_REQUIRED");
      });

      it("rejects invalid body schema", async () => {
        const { POST } = await import("@/app/api/classify/correct/route");
        const user = await createTestUser();
        const org = await createTestOrganization();
        await createTestMembership({ organization: org, user, role: "MEMBER" });
        setMockSession(user);
        setMockOrganizationCookie(org.id);

        const request = buildRequest("http://localhost/api/classify/correct", {
          method: "POST",
          body: {
            citingId: "",
            citedId: "W200",
            edgeType: "invalid-stance",
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.code).toBe("INVALID_REQUEST");
      });
    });

    describe("TC-CORR-01: Persist Human Calibration", () => {
      it("persists human correction with isCalibrated=true and audit log", async () => {
        const { POST } = await import("@/app/api/classify/correct/route");
        const user = await createTestUser();
        const org = await createTestOrganization();
        await createTestMembership({ organization: org, user, role: "MEMBER" });
        setMockSession(user);
        setMockOrganizationCookie(org.id);

        const prisma = getTestPrisma();

        const request = buildRequest("http://localhost/api/classify/correct", {
          method: "POST",
          body: {
            citingId: "W_CITING_01",
            citedId: "W_CITED_01",
            edgeType: "contradicts",
            comment: "Authors explicitly challenge findings on page 12.",
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBe(true);
        expect(body.edgeType).toBe("contradicts");
        expect(body.provenance.provider).toBe("user-correction");
        expect(body.provenance.humanReviewed).toBe(true);
        expect(body.provenance.reviewerId).toBe(user.id);

        // Verify DB record
        const record = await prisma.citationCache.findUnique({
          where: {
            citingId_citedId: {
              citingId: "W_CITING_01",
              citedId: "W_CITED_01",
            },
          },
        });

        expect(record).not.toBeNull();
        expect(record?.edgeType).toBe("contradicts");
        expect(record?.isCalibrated).toBe(true);
        expect(record?.reviewerId).toBe(user.id);
        expect(record?.calibrationFeedback).toContain(
          "challenge findings on page 12",
        );
        expect(record?.classifierVersion).toBe(999);

        // Verify Audit Event
        const audit = await prisma.auditEvent.findFirst({
          where: {
            organizationId: org.id,
            action: "ai.correction_saved",
          },
        });
        expect(audit).not.toBeNull();
      });
    });

    describe("TC-CORR-03 & TC-CORR-04: Dataset Export (JSON & JSONL)", () => {
      it("exports calibration records as structured JSON with breakdown", async () => {
        const { GET } = await import("@/app/api/classify/correct/route");
        const user = await createTestUser();
        const org = await createTestOrganization();
        await createTestMembership({ organization: org, user, role: "ADMIN" });
        setMockSession(user);
        setMockOrganizationCookie(org.id);

        const prisma = getTestPrisma();

        // Seed 2 calibration records
        await prisma.citationCache.createMany({
          data: [
            {
              citingId: "W1",
              citedId: "W2",
              edgeType: "supports",
              confidence: 1.0,
              snippet: "User confirmed support.",
              provider: "user-correction",
              isCalibrated: true,
              reviewerId: user.id,
              calibrationFeedback: "Replication confirmed.",
              classifierVersion: 999,
            },
            {
              citingId: "W3",
              citedId: "W4",
              edgeType: "contradicts",
              confidence: 1.0,
              snippet: "User confirmed contradiction.",
              provider: "user-correction",
              isCalibrated: true,
              reviewerId: user.id,
              calibrationFeedback: "Direct counter-evidence.",
              classifierVersion: 999,
            },
          ],
        });

        const request = buildRequest("http://localhost/api/classify/correct", {
          method: "GET",
        });

        const response = await GET(request);
        expect(response.status).toBe(200);
        const body = await response.json();

        expect(body.totalCalibrated).toBe(2);
        expect(body.breakdown.supports).toBe(1);
        expect(body.breakdown.contradicts).toBe(1);
        expect(body.records.length).toBe(2);
        expect(body.records[0].reviewerId).toBe(user.id);
      });

      it("TC-CORR-04: exports dataset in JSONL format for direct ML training", async () => {
        const { GET } = await import("@/app/api/classify/correct/route");
        const user = await createTestUser();
        const org = await createTestOrganization();
        await createTestMembership({ organization: org, user, role: "ADMIN" });
        setMockSession(user);
        setMockOrganizationCookie(org.id);

        const prisma = getTestPrisma();

        await prisma.citationCache.create({
          data: {
            citingId: "W10",
            citedId: "W20",
            edgeType: "extends",
            confidence: 1.0,
            snippet: "Method extended to new domain.",
            provider: "user-correction",
            isCalibrated: true,
            reviewerId: user.id,
            calibrationFeedback: "Extension validated.",
            classifierVersion: 999,
          },
        });

        const request = buildRequest(
          "http://localhost/api/classify/correct?format=jsonl",
          {
            method: "GET",
          },
        );

        const response = await GET(request);
        expect(response.status).toBe(200);
        expect(response.headers.get("Content-Type")).toContain(
          "application/x-ndjson",
        );

        const text = await response.text();
        const lines = text.trim().split("\n");
        expect(lines.length).toBe(1);

        const parsed = JSON.parse(lines[0]);
        expect(parsed.citingId).toBe("W10");
        expect(parsed.expected).toBe("extends");
        expect(parsed.reviewerId).toBe(user.id);
      });

      it("TC-CORR-05: filters dataset by stance", async () => {
        const { GET } = await import("@/app/api/classify/correct/route");
        const user = await createTestUser();
        const org = await createTestOrganization();
        await createTestMembership({ organization: org, user, role: "ADMIN" });
        setMockSession(user);
        setMockOrganizationCookie(org.id);

        const prisma = getTestPrisma();

        await prisma.citationCache.createMany({
          data: [
            {
              citingId: "WA",
              citedId: "WB",
              edgeType: "supports",
              confidence: 1.0,
              snippet: "Supports finding.",
              provider: "user-correction",
              isCalibrated: true,
              reviewerId: user.id,
            },
            {
              citingId: "WC",
              citedId: "WD",
              edgeType: "contradicts",
              confidence: 1.0,
              snippet: "Contradicts finding.",
              provider: "user-correction",
              isCalibrated: true,
              reviewerId: user.id,
            },
          ],
        });

        const request = buildRequest(
          "http://localhost/api/classify/correct?edgeType=contradicts",
          {
            method: "GET",
          },
        );

        const response = await GET(request);
        expect(response.status).toBe(200);
        const body = await response.json();

        expect(body.totalCalibrated).toBe(1);
        expect(body.records.length).toBe(1);
        expect(body.records[0].expected).toBe("contradicts");
      });
    });
  },
);
