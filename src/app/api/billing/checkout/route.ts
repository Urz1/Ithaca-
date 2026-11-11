import { NextRequest } from "next/server";
import { z } from "zod";
import {
  apiError,
  apiSuccess,
  createApiContext,
} from "@/lib/api/api-contracts";
import {
  checkApiRateLimit,
  isRejection,
  requireApiAuth,
} from "@/lib/api/api-auth";
import { getOrganizationContext } from "@/lib/organization-context";
import { prisma } from "@/lib/prisma";
import {
  isAcademicPartnerEmail,
  isEthiopianAcademicEmail,
  planQuotaFields,
} from "@/lib/platform/org-plans";

const checkoutSchema = z.object({
  plan: z.enum(["SOLO_PRO", "LAB", "INSTITUTION"]),
  currency: z.enum(["USD", "EUR", "GBP"]).optional().default("USD"),
  redirectUrl: z.string().url().optional(),
});

const PLAN_PRICING_USD: Record<"SOLO_PRO" | "LAB" | "INSTITUTION", number> = {
  SOLO_PRO: 15,
  LAB: 99,
  INSTITUTION: 499,
};

export async function POST(request: NextRequest) {
  const context = createApiContext(request);
  const authResult = await requireApiAuth(request, context);
  if (isRejection(authResult)) return authResult;

  const org = await getOrganizationContext();
  const organizationId =
    org?.organizationId ||
    (
      await prisma.membership.findFirst({
        where: { userId: authResult.user.id },
        select: { organizationId: true },
      })
    )?.organizationId;

  if (!organizationId) {
    return apiError(
      "AUTHENTICATION_REQUIRED",
      "Organization context required",
      context,
    );
  }

  const rateLimited = await checkApiRateLimit(
    authResult.user.id,
    "billing-checkout",
    20,
    context,
  );
  if (rateLimited) return rateLimited;

  try {
    const body = await request.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return apiError(
        "INVALID_REQUEST",
        "Invalid plan checkout parameters",
        context,
        { details: parsed.error.flatten() },
      );
    }

    const { plan, currency, redirectUrl } = parsed.data;
    const userEmail = authResult.user.email;

    // 1. Sovereign Academic Exemption Protocol (.edu.et)
    // Under Ethiopian Startup Proclamation No. 1396/2025, accredited Ethiopian higher
    // education faculty, researchers, and students receive 100% free Institutional Tier access.
    if (isEthiopianAcademicEmail(userEmail)) {
      const quotas = planQuotaFields("INSTITUTION");

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          isSovereignExempt: true,
          subscriptionStatus: "active",
          currency: "ETB",
          ...quotas,
        },
      });

      return apiSuccess(
        {
          isSovereignExempt: true,
          plan: "INSTITUTION",
          checkoutUrl: null,
          price: 0,
          currency: "ETB",
          message:
            "Sovereign Ethiopian Academic Exemption applied under Proclamation 1396/2025. Full Institutional Tier unlocked at zero cost.",
        },
        context,
      );
    }

    // 2. Verified Institutional Partner Workspace Exemption
    const existingOrg = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { isSovereignExempt: true },
    });

    if (existingOrg?.isSovereignExempt) {
      const quotas = planQuotaFields("INSTITUTION");

      await prisma.organization.update({
        where: { id: organizationId },
        data: {
          subscriptionStatus: "active",
          currency: "USD",
          ...quotas,
        },
      });

      return apiSuccess(
        {
          isSovereignExempt: true,
          plan: "INSTITUTION",
          checkoutUrl: null,
          price: 0,
          currency: "USD",
          message:
            "Academic Partner Exemption applied. Full Institutional Tier unlocked at zero cost.",
        },
        context,
      );
    }

    // 2. Global Commercial Checkout (USD FX Inflow)
    const price = PLAN_PRICING_USD[plan];
    const checkoutHost =
      process.env.PADDLE_CHECKOUT_URL || "https://checkout.ithaca.rhizan.com";
    const sessionToken = crypto.randomUUID();
    const checkoutUrl = `${checkoutHost}/session?orgId=${encodeURIComponent(
      organizationId,
    )}&plan=${plan}&currency=${currency}&price=${price}&token=${sessionToken}${
      redirectUrl ? `&redirect=${encodeURIComponent(redirectUrl)}` : ""
    }`;

    return apiSuccess(
      {
        isSovereignExempt: false,
        plan,
        price,
        currency,
        checkoutUrl,
      },
      context,
    );
  } catch (error) {
    console.error("[billing/checkout:POST]", error);
    return apiError(
      "INTERNAL_ERROR",
      "Failed to initiate billing checkout",
      context,
    );
  }
}
