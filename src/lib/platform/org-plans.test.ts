import { describe, expect, it } from "vitest";
import {
  getPlanEntitlements,
  GLOBAL_ACADEMIC_DOMAINS,
  isAcademicPartnerEmail,
  isEmailAllowedForOrganization,
  isEthiopianAcademicEmail,
  isOrganizationPlanId,
  normalizeEmailDomain,
  parseEmailDomainList,
  planQuotaFields,
  resolveSovereignPlan,
} from "./org-plans";

describe("org plans", () => {
  it("gives institutions more seats than labs and solos", () => {
    expect(getPlanEntitlements("SOLO").maxMembers).toBeLessThan(
      getPlanEntitlements("LAB").maxMembers,
    );
    expect(getPlanEntitlements("LAB").maxMembers).toBeLessThan(
      getPlanEntitlements("INSTITUTION").maxMembers,
    );
    expect(planQuotaFields("LAB").plan).toBe("LAB");
    expect(getPlanEntitlements("LAB").collaborativeWorkspaces).toBe(true);
    expect(getPlanEntitlements("SOLO").collaborativeWorkspaces).toBe(false);
    expect(isOrganizationPlanId("INSTITUTION")).toBe(true);
    expect(isOrganizationPlanId("SOLO_PRO")).toBe(true);
    expect(isOrganizationPlanId("ENTERPRISE")).toBe(false);
    expect(getPlanEntitlements("SOLO_PRO").priceLabel).toBe("$15/mo");
    expect(getPlanEntitlements("SOLO_PRO").maxPaperRecords).toBe(15_000);
  });

  it("enforces domain allowlists for institutional invites", () => {
    expect(normalizeEmailDomain("Ada@Lab.EDU")).toBe("lab.edu");
    expect(
      isEmailAllowedForOrganization("ada@lab.edu", ["lab.edu", "college.edu"]),
    ).toBe(true);
    expect(isEmailAllowedForOrganization("ada@gmail.com", ["lab.edu"])).toBe(
      false,
    );
    expect(isEmailAllowedForOrganization("ada@lab.edu", [])).toBe(true);
    expect(parseEmailDomainList("lab.edu, College.EDU\nlab.edu")).toEqual([
      "lab.edu",
      "college.edu",
    ]);
  });

  it("detects sovereign Ethiopian academic email addresses and grants institutional tier (TC-BILL-01)", () => {
    // Valid Ethiopian academic domains (.edu.et)
    expect(isEthiopianAcademicEmail("researcher@aau.edu.et")).toBe(true);
    expect(isEthiopianAcademicEmail("student@ju.edu.et")).toBe(true);
    expect(isEthiopianAcademicEmail("faculty@hu.edu.et")).toBe(true);
    expect(isEthiopianAcademicEmail("dean@astu.edu.et")).toBe(true);
    expect(isEthiopianAcademicEmail("scholar@bdu.edu.et")).toBe(true);

    // Non-Ethiopian or non-academic domains
    expect(isEthiopianAcademicEmail("user@stanford.edu")).toBe(false);
    expect(isEthiopianAcademicEmail("researcher@ethionet.et")).toBe(false);
    expect(isEthiopianAcademicEmail("author@gmail.com")).toBe(false);
    expect(isEthiopianAcademicEmail("")).toBe(false);

    // Sovereign plan resolution
    expect(resolveSovereignPlan("researcher@aau.edu.et")).toEqual({
      isSovereignExempt: true,
      plan: "INSTITUTION",
    });
    expect(resolveSovereignPlan("author@gmail.com")).toEqual({
      isSovereignExempt: false,
      plan: "SOLO",
    });
  });

  it("detects global academic partner emails and custom partner domains", () => {
    expect(GLOBAL_ACADEMIC_DOMAINS).toContain("edu");
    expect(GLOBAL_ACADEMIC_DOMAINS).toContain("ac.uk");

    // Global academic domains
    expect(isAcademicPartnerEmail("prof@stanford.edu")).toBe(true);
    expect(isAcademicPartnerEmail("researcher@cam.ac.uk")).toBe(true);
    expect(isAcademicPartnerEmail("fellow@aau.edu.et")).toBe(true);
    expect(isAcademicPartnerEmail("doc@ox.ac.uk")).toBe(true);

    // Custom partner domains
    expect(
      isAcademicPartnerEmail("scientist@cern.ch", ["cern.ch", "max-planck.de"]),
    ).toBe(true);
    expect(isAcademicPartnerEmail("postdoc@sub.cern.ch", ["cern.ch"])).toBe(
      true,
    );
    expect(isAcademicPartnerEmail("engineer@company.com", ["cern.ch"])).toBe(
      false,
    );

    // Non-academic commercial email
    expect(isAcademicPartnerEmail("user@gmail.com")).toBe(false);
    expect(isAcademicPartnerEmail("")).toBe(false);
  });
});
