export const ORGANIZATION_PLANS = {
  SOLO: "SOLO",
  SOLO_PRO: "SOLO_PRO",
  LAB: "LAB",
  INSTITUTION: "INSTITUTION",
} as const;

export type OrganizationPlanId =
  (typeof ORGANIZATION_PLANS)[keyof typeof ORGANIZATION_PLANS];

export interface PlanEntitlements {
  id: OrganizationPlanId;
  label: string;
  description: string;
  maxMembers: number;
  maxProjects: number;
  maxCollections: number;
  maxSavedGraphs: number;
  maxPaperRecords: number;
  maxAiRequests: number;
  maxApiRequests: number;
  collaborativeWorkspaces: boolean;
  domainAllowlist: boolean;
  priceLabel: string;
}

export const PLAN_ENTITLEMENTS: Record<OrganizationPlanId, PlanEntitlements> = {
  SOLO: {
    id: "SOLO",
    label: "Solo",
    description: "Individual researchers exploring debates quickly.",
    maxMembers: 3,
    maxProjects: 10,
    maxCollections: 25,
    maxSavedGraphs: 25,
    maxPaperRecords: 5_000,
    maxAiRequests: 50_000,
    maxApiRequests: 1_000,
    collaborativeWorkspaces: false,
    domainAllowlist: false,
    priceLabel: "Free",
  },
  SOLO_PRO: {
    id: "SOLO_PRO",
    label: "Solo Pro",
    description:
      "Power researchers needing unlimited synthesis, deeper citation graphs, and Zotero conflict monitoring.",
    maxMembers: 5,
    maxProjects: 25,
    maxCollections: 100,
    maxSavedGraphs: 100,
    maxPaperRecords: 15_000,
    maxAiRequests: 500_000,
    maxApiRequests: 5_000,
    collaborativeWorkspaces: false,
    domainAllowlist: false,
    priceLabel: "$15/mo",
  },
  LAB: {
    id: "LAB",
    label: "Lab",
    description: "Small research groups with shared projects and notes.",
    maxMembers: 15,
    maxProjects: 50,
    maxCollections: 200,
    maxSavedGraphs: 200,
    maxPaperRecords: 25_000,
    maxAiRequests: 2_000_000,
    maxApiRequests: 5_000,
    collaborativeWorkspaces: true,
    domainAllowlist: false,
    priceLabel: "Pilot / contact",
  },
  INSTITUTION: {
    id: "INSTITUTION",
    label: "Institution",
    description:
      "Departments and universities with seat limits and domain-gated invites.",
    maxMembers: 100,
    maxProjects: 250,
    maxCollections: 1_000,
    maxSavedGraphs: 1_000,
    maxPaperRecords: 100_000,
    maxAiRequests: 10_000_000,
    maxApiRequests: 25_000,
    collaborativeWorkspaces: true,
    domainAllowlist: true,
    priceLabel: "Pilot / contact",
  },
};

export function isOrganizationPlanId(
  value: string,
): value is OrganizationPlanId {
  return Object.prototype.hasOwnProperty.call(ORGANIZATION_PLANS, value);
}

export function getPlanEntitlements(
  plan: OrganizationPlanId,
): PlanEntitlements {
  return PLAN_ENTITLEMENTS[plan] ?? PLAN_ENTITLEMENTS.SOLO;
}

export function parseEmailDomainList(raw: string): string[] {
  const domains = raw
    .split(/[\s,;]+/)
    .map((item) => normalizeEmailDomain(item))
    .filter((item): item is string => Boolean(item));
  return [...new Set(domains)];
}

export function planQuotaFields(plan: OrganizationPlanId) {
  const entitlements = getPlanEntitlements(plan);
  return {
    plan,
    maxMembers: entitlements.maxMembers,
    maxProjects: entitlements.maxProjects,
    maxCollections: entitlements.maxCollections,
    maxSavedGraphs: entitlements.maxSavedGraphs,
    maxPaperRecords: entitlements.maxPaperRecords,
    maxAiRequests: entitlements.maxAiRequests,
    maxApiRequests: entitlements.maxApiRequests,
  };
}

export function normalizeEmailDomain(emailOrDomain: string): string | null {
  const value = emailOrDomain.trim().toLowerCase();
  if (!value) return null;
  if (value.includes("@")) {
    const domain = value.split("@").pop()?.trim();
    return domain || null;
  }
  return value.replace(/^\.+/, "");
}

export function isEmailAllowedForOrganization(
  email: string,
  allowedDomains: string[],
): boolean {
  if (allowedDomains.length === 0) return true;
  const domain = normalizeEmailDomain(email);
  if (!domain) return false;
  const allowed = new Set(
    allowedDomains
      .map((item) => normalizeEmailDomain(item))
      .filter((item): item is string => Boolean(item)),
  );
  return allowed.has(domain);
}

/**
 * Global accredited academic domain suffixes and top-level domains.
 */
export const GLOBAL_ACADEMIC_DOMAINS = [
  "edu",
  "ac.uk",
  "edu.au",
  "edu.et",
  "edu.ng",
  "edu.za",
  "ac.in",
  "edu.cn",
  "edu.sg",
  "edu.br",
];

/**
 * Checks whether an email address belongs to an accredited university or registered partner institution.
 */
export function isAcademicPartnerEmail(
  email: string,
  additionalPartnerDomains: string[] = [],
): boolean {
  const domain = normalizeEmailDomain(email);
  if (!domain) return false;

  // Check additional registered partner domains
  const normalizedPartners = additionalPartnerDomains
    .map((d) => normalizeEmailDomain(d))
    .filter((d): d is string => Boolean(d));

  if (
    normalizedPartners.some((p) => domain === p || domain.endsWith(`.${p}`))
  ) {
    return true;
  }

  // Check standard global academic domain suffixes
  return GLOBAL_ACADEMIC_DOMAINS.some(
    (suffix) => domain === suffix || domain.endsWith(`.${suffix}`),
  );
}

/**
 * Checks whether an email address belongs to an accredited Ethiopian higher education
 * institution (.edu.et), e.g. @aau.edu.et, @ju.edu.et, @hu.edu.et, @astu.edu.et.
 * Under Ethiopia's Startup Proclamation 1396/2025, these sovereign researchers
 * receive 100% free Institutional Tier access.
 */
export function isEthiopianAcademicEmail(email: string): boolean {
  const domain = normalizeEmailDomain(email);
  if (!domain) return false;
  return domain === "edu.et" || domain.endsWith(".edu.et");
}

/**
 * Resolves the default plan and sovereign exemption status for a user based on their email.
 */
export function resolveSovereignPlan(email: string): {
  isSovereignExempt: boolean;
  plan: OrganizationPlanId;
} {
  if (isEthiopianAcademicEmail(email)) {
    return {
      isSovereignExempt: true,
      plan: "INSTITUTION",
    };
  }
  return {
    isSovereignExempt: false,
    plan: "SOLO",
  };
}
