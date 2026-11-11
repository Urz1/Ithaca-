import { FEATURE_FLAGS } from "@/lib/platform/feature-flags";
import { isFeatureEnabledForOrganization } from "@/lib/platform/org-rollout";

export const PRODUCT_EVENTS = {
  accountCreated: "account_created",
  organizationCreated: "organization_created",
  memberInvited: "member_invited",
  searchCompleted: "search_completed",
  firstGraphReady: "first_graph_ready",
  evidenceReviewed: "evidence_reviewed",
  graphSaved: "graph_saved",
  exportCompleted: "export_completed",
  feedbackSubmitted: "feedback_submitted",
} as const;

export type ProductEventName =
  (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];

type SafeProperty = string | number | boolean | null;

export interface ProductEvent {
  name: ProductEventName;
  anonymousId: string;
  organizationId?: string;
  properties?: Record<string, SafeProperty>;
  occurredAt: string;
}

const FORBIDDEN_PROPERTY_NAMES =
  /email|name|password|secret|token|paper.?content|abstract|prompt/i;

export function sanitizeProductEvent(event: ProductEvent): ProductEvent {
  const properties = Object.fromEntries(
    Object.entries(event.properties ?? {}).filter(
      ([key]) => !FORBIDDEN_PROPERTY_NAMES.test(key),
    ),
  );

  return {
    ...event,
    properties,
  };
}

export function emitProductEvent(event: ProductEvent): void {
  const safeEvent = sanitizeProductEvent(event);
  console.info(JSON.stringify({ type: "product_event", ...safeEvent }));
}

export async function emitProductEventForOrganization(
  event: Omit<ProductEvent, "occurredAt"> & { occurredAt?: string },
  organizationId?: string | null,
): Promise<void> {
  const enabled = await isFeatureEnabledForOrganization(
    FEATURE_FLAGS.productAnalytics,
    organizationId,
  );
  if (!enabled) return;

  emitProductEvent({
    ...event,
    organizationId: organizationId ?? event.organizationId,
    occurredAt: event.occurredAt ?? new Date().toISOString(),
  });
}
