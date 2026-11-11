import { NextRequest } from "next/server";
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
    "billing-portal",
    20,
    context,
  );
  if (rateLimited) return rateLimited;

  try {
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        id: true,
        plan: true,
        billingCustomerId: true,
        subscriptionId: true,
        subscriptionStatus: true,
        isSovereignExempt: true,
      },
    });

    if (!organization) {
      return apiError("INVALID_REQUEST", "Organization not found", context);
    }

    if (organization.isSovereignExempt) {
      return apiSuccess(
        {
          isSovereignExempt: true,
          portalUrl: null,
          message:
            "This organization is covered under the Sovereign Ethiopian Academic Exemption (Proclamation 1396/2025). No external billing portal required.",
        },
        context,
      );
    }

    const portalHost =
      process.env.PADDLE_PORTAL_URL || "https://billing.ithaca.tech";
    const portalUrl = `${portalHost}/p/${organization.billingCustomerId || organization.id}`;

    return apiSuccess(
      {
        portalUrl,
        plan: organization.plan,
        status: organization.subscriptionStatus,
      },
      context,
    );
  } catch (error) {
    console.error("[billing/portal:POST]", error);
    return apiError(
      "INTERNAL_ERROR",
      "Failed to retrieve billing portal",
      context,
    );
  }
}
