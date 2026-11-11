import { NextRequest } from "next/server";
import { z } from "zod";
import {
  apiError,
  apiSuccess,
  createApiContext,
} from "@/lib/api/api-contracts";
import { prisma } from "@/lib/prisma";
import {
  planQuotaFields,
  type OrganizationPlanId,
} from "@/lib/platform/org-plans";

const webhookSchema = z.object({
  event: z.string(),
  organizationId: z.string().min(1),
  plan: z
    .enum(["SOLO", "SOLO_PRO", "LAB", "INSTITUTION"])
    .optional()
    .default("SOLO_PRO"),
  amount: z.number().optional().default(15),
  currency: z.string().optional().default("USD"),
  provider: z.string().optional().default("paddle"),
  subscriptionId: z.string().optional(),
  customerId: z.string().optional(),
  invoiceUrl: z.string().optional(),
});

function normalizeWebhookPayload(body: any) {
  if (
    body?.data &&
    (body.data.custom_data?.organizationId || body.event_type)
  ) {
    const event = body.event_type || body.event || "subscription.created";
    const data = body.data;
    return {
      event,
      organizationId: data.custom_data?.organizationId || body.organizationId,
      plan: data.custom_data?.plan || body.plan || "SOLO_PRO",
      amount: data.details?.totals?.total
        ? Number(data.details.totals.total) / 100
        : (body.amount ?? 15),
      currency: data.currency_code || body.currency || "USD",
      provider: "paddle",
      subscriptionId: data.id || data.subscription_id || body.subscriptionId,
      customerId: data.customer_id || body.customerId,
      invoiceUrl: data.invoice_url || body.invoiceUrl,
    };
  }
  return body;
}

export async function POST(request: NextRequest) {
  const context = createApiContext(request);

  // 1. Signature Verification (when secret configured)
  const webhookSecret = process.env.BILLING_WEBHOOK_SECRET;
  if (webhookSecret) {
    const signature =
      request.headers.get("paddle-signature") ||
      request.headers.get("x-webhook-signature") ||
      request.headers.get("stripe-signature");

    if (!signature || signature !== webhookSecret) {
      return apiError(
        "AUTHENTICATION_REQUIRED",
        "Invalid webhook signature",
        context,
      );
    }
  }

  try {
    const rawBody = await request.json();
    const body = normalizeWebhookPayload(rawBody);
    const parsed = webhookSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "INVALID_REQUEST",
        "Invalid webhook payload structure",
        context,
        { details: parsed.error.flatten() },
      );
    }

    const {
      event,
      organizationId,
      plan,
      amount,
      currency,
      provider,
      subscriptionId,
      customerId,
      invoiceUrl,
    } = parsed.data;

    // Verify organization exists
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return apiError("INVALID_REQUEST", "Organization not found", context);
    }

    // 2. Handle Subscription & Payment Lifecycle
    if (
      event === "subscription.created" ||
      event === "payment.succeeded" ||
      event === "subscription.updated"
    ) {
      const quotas = planQuotaFields(plan as OrganizationPlanId);

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          subscriptionStatus: "active",
          subscriptionId: subscriptionId ?? organization.subscriptionId,
          billingCustomerId: customerId ?? organization.billingCustomerId,
          currency,
          isSovereignExempt: false,
          ...quotas,
        },
      });

      // 3. Record NBE FX Compliant Billing Transaction
      // All international USD inflows are tagged under NBE Proclamation 1396/2025
      // for 100% FX retention in the startup's designated account.
      const transaction = await prisma.billingTransaction.create({
        data: {
          organizationId,
          amount,
          currency,
          provider,
          status: "completed",
          invoiceUrl,
          nbeFxCompliant: true,
          metadata: {
            event,
            subscriptionId,
            customerId,
          },
        },
      });

      return apiSuccess(
        {
          processed: true,
          event,
          organizationId,
          transactionId: transaction.id,
          nbeFxCompliant: transaction.nbeFxCompliant,
        },
        context,
      );
    }

    if (event === "subscription.canceled") {
      const soloQuotas = planQuotaFields("SOLO");

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          subscriptionStatus: "canceled",
          ...soloQuotas,
        },
      });

      return apiSuccess(
        {
          processed: true,
          event,
          organizationId,
          status: "canceled",
        },
        context,
      );
    }

    return apiSuccess({ processed: true, ignored: true, event }, context);
  } catch (error) {
    console.error("[billing/webhook:POST]", error);
    return apiError(
      "INTERNAL_ERROR",
      "Failed to process billing webhook",
      context,
    );
  }
}
