import { describe, expect, it } from "vitest";
import { evaluateLaunchGates } from "./launch-gates";

const passingInput = {
  qualityChecksPassed: true,
  buildPassed: true,
  evalPassed: true,
  integrationSuitePassed: true,
  migrationsPresent: true,
  runbooksPresent: true,
  loadBudgetsPresent: true,
  highSeverityVulnerabilities: 0,
  restoreDrillDocumented: true,
};

describe("evaluateLaunchGates", () => {
  it("passes when all evidence gates are satisfied", () => {
    const result = evaluateLaunchGates(passingInput);
    expect(result.passed).toBe(true);
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });

  it("fails when integration or dependency gates are unsatisfied", () => {
    const result = evaluateLaunchGates({
      ...passingInput,
      integrationSuitePassed: false,
      evalPassed: false,
      highSeverityVulnerabilities: 2,
    });

    expect(result.passed).toBe(false);
    expect(
      result.checks.filter((check) => !check.passed).map((check) => check.id),
    ).toEqual(["ai_eval_baseline", "integration_suite", "dependency_audit"]);
  });
});
