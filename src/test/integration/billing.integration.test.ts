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
  "Global Billing & Sovereign FX Retention API Integration",
  () => {
    beforeEach(async () => {
      await resetDatabase();
      clearAuthMocks();
      vi.unstubAllEnvs();
    });

    afterAll(async () => {
      await disconnectTestDatabase();
    });

    describe("Checkout Session & Sovereign Exemption", () => {
      it("rejects unauthenticated checkout requests", async () => {
        const { POST } = await import("@/app/api/billing/checkout/route");
        const request = buildRequest("http://localhost/api/billing/checkout", {
          method: "POST",
          body: { plan: "SOLO_PRO" },
        });
        const response = await POST(request);
        expect(response.status).toBe(401);
      });

      it("TC-BILL-02: generates USD checkout session for international researcher (SOLO_PRO)", async () => {
        const { POST } = await import("@/app/api/billing/checkout/route");
        const user = await createTestUser({ email: "researcher@mit.edu" });
        const org = await createTestOrganization();
        await createTestMembership({ organization: org, user, role: "OWNER" });
        setMockSession(user);
        setMockOrganizationCookie(org.id);

        const request = buildRequest("http://localhost/api/billing/checkout", {
          method: "POST",
          body: { plan: "SOLO_PRO", currency: "USD" },
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        const body = await response.json();

        expect(body.isSovereignExempt).toBe(false);
        expect(body.plan).toBe("SOLO_PRO");
        expect(body.price).toBe(15);
        expect(body.currency).toBe("USD");
        expect(body.checkoutUrl).toBeDefined();
        expect(body.checkoutUrl).toContain(`orgId=${org.id}`);
        expect(body.checkoutUrl).toContain("plan=SOLO_PRO");
      });

      it("TC-BILL-03: grants 100% free Institutional Tier to Ethiopian .edu.et academic (Zero Pay)", async () => {
        const { POST } = await import("@/app/api/billing/checkout/route");
        const prisma = getTestPrisma();
        const user = await createTestUser({ email: "dean@ju.edu.et" }); // Jimma University
        const org = await createTestOrganization({ plan: "SOLO" });
        await createTestMembership({ organization: org, user, role: "OWNER" });
        setMockSession(user);
        setMockOrganizationCookie(org.id);

        const request = buildRequest("http://localhost/api/billing/checkout", {
          method: "POST",
          body: { plan: "SOLO_PRO" }, // Even if they click Solo Pro, sovereign exemption awards full Institution tier
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        const body = await response.json();

        expect(body.isSovereignExempt).toBe(true);
        expect(body.plan).toBe("INSTITUTION");
        expect(body.price).toBe(0);
        expect(body.checkoutUrl).toBeNull();
        expect(body.message).toContain(
          "Sovereign Ethiopian Academic Exemption",
        );

        // Verify DB was updated immediately to free Institution tier with sovereign flag
        const updatedOrg = await prisma.organization.findUnique({
          where: { id: org.id },
        });
        expect(updatedOrg?.plan).toBe("INSTITUTION");
        expect(updatedOrg?.isSovereignExempt).toBe(true);
        expect(updatedOrg?.subscriptionStatus).toBe("active");
        expect(updatedOrg?.maxPaperRecords).toBe(100_000);
      });
    });

    describe("Webhooks & NBE FX Retention Compliance", () => {
      it("TC-BILL-04 & TC-BILL-05: processes subscription created webhook and logs NBE compliant transaction", async () => {
        const { POST } = await import("@/app/api/billing/webhook/route");
        const prisma = getTestPrisma();
        const org = await createTestOrganization({ plan: "SOLO" });

        const webhookPayload = {
          event: "subscription.created",
          organizationId: org.id,
          plan: "SOLO_PRO",
          amount: 15.0,
          currency: "USD",
          provider: "paddle",
          subscriptionId: "sub_paddle_123456",
          customerId: "ctm_paddle_789",
        };

        const headers: Record<string, string> = {};
        if (process.env.BILLING_WEBHOOK_SECRET) {
          headers["paddle-signature"] = process.env.BILLING_WEBHOOK_SECRET;
        }

        const request = buildRequest("http://localhost/api/billing/webhook", {
          method: "POST",
          headers,
          body: webhookPayload,
        });

        const response = await POST(request);
        expect(response.status).toBe(200);
        const body = await response.json();

        expect(body.processed).toBe(true);
        expect(body.nbeFxCompliant).toBe(true);
        expect(body.transactionId).toBeDefined();

        // Check organization was updated
        const updatedOrg = await prisma.organization.findUnique({
          where: { id: org.id },
        });
        expect(updatedOrg?.plan).toBe("SOLO_PRO");
        expect(updatedOrg?.subscriptionStatus).toBe("active");
        expect(updatedOrg?.subscriptionId).toBe("sub_paddle_123456");

        // TC-BILL-05: Check transaction was recorded with NBE FX compliance flag
        const transaction = await prisma.billingTransaction.findUnique({
          where: { id: body.transactionId },
        });
        expect(transaction).toBeDefined();
        expect(transaction?.amount).toBe(15.0);
        expect(transaction?.currency).toBe("USD");
        expect(transaction?.provider).toBe("paddle");
        expect(transaction?.nbeFxCompliant).toBe(true);
      });

      it("processes subscription.canceled event and downgrades to SOLO", async () => {
        const { POST } = await import("@/app/api/billing/webhook/route");
        const prisma = getTestPrisma();
        const org = await createTestOrganization({
          plan: "SOLO_PRO",
          subscriptionStatus: "active",
        });

        const headers: Record<string, string> = {};
        if (process.env.BILLING_WEBHOOK_SECRET) {
          headers["paddle-signature"] = process.env.BILLING_WEBHOOK_SECRET;
        }

        const request = buildRequest("http://localhost/api/billing/webhook", {
          method: "POST",
          headers,
          body: {
            event: "subscription.canceled",
            organizationId: org.id,
          },
        });

        const response = await POST(request);
        expect(response.status).toBe(200);

        const updatedOrg = await prisma.organization.findUnique({
          where: { id: org.id },
        });
        expect(updatedOrg?.plan).toBe("SOLO");
        expect(updatedOrg?.subscriptionStatus).toBe("canceled");
      });

      it("verifies webhook signature when BILLING_WEBHOOK_SECRET is set", async () => {
        process.env.BILLING_WEBHOOK_SECRET = "super-secret-signature";
        const { POST } = await import("@/app/api/billing/webhook/route");
        const org = await createTestOrganization();

        // 1. Missing signature
        const badRequest = buildRequest(
          "http://localhost/api/billing/webhook",
          {
            method: "POST",
            body: { event: "payment.succeeded", organizationId: org.id },
          },
        );
        const badRes = await POST(badRequest);
        expect(badRes.status).toBe(401);

        // 2. Valid signature
        const goodRequest = buildRequest(
          "http://localhost/api/billing/webhook",
          {
            method: "POST",
            headers: {
              "x-webhook-signature": "super-secret-signature",
            },
            body: {
              event: "payment.succeeded",
              organizationId: org.id,
              amount: 99.0,
              plan: "LAB",
            },
          },
        );
        const goodRes = await POST(goodRequest);
        expect(goodRes.status).toBe(200);
      });
    });

    describe("Billing Portal", () => {
      it("returns portal link for active subscriber", async () => {
        const { POST } = await import("@/app/api/billing/portal/route");
        const user = await createTestUser();
        const org = await createTestOrganization({
          plan: "SOLO_PRO",
          billingCustomerId: "cus_abc_999",
        });
        await createTestMembership({ organization: org, user, role: "OWNER" });
        setMockSession(user);
        setMockOrganizationCookie(org.id);

        const request = buildRequest("http://localhost/api/billing/portal", {
          method: "POST",
        });
        const response = await POST(request);
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.portalUrl).toContain("/p/cus_abc_999");
      });
    });
  },
);
