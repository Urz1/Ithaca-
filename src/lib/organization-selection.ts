export const ACTIVE_ORGANIZATION_COOKIE = "ithaca_org_id";

export function isValidOrganizationId(
  value: string | undefined | null,
): value is string {
  return Boolean(value && value.length >= 8);
}
