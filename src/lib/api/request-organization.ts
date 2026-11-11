import type { NextRequest } from "next/server";
import { getOrganizationContext } from "@/lib/organization-context";

export async function getOptionalOrganizationContextFromRequest(
  _request: NextRequest,
) {
  try {
    return await getOrganizationContext();
  } catch {
    return null;
  }
}
