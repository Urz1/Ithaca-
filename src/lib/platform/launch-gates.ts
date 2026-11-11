import { LOAD_BUDGETS } from "./load-budgets";

export interface LaunchGateCheck {
  id: string;
  passed: boolean;
  detail: string;
}

export interface LaunchGateInput {
  qualityChecksPassed: boolean;
  buildPassed: boolean;
  evalPassed: boolean;
  integrationSuitePassed: boolean;
  migrationsPresent: boolean;
  runbooksPresent: boolean;
  loadBudgetsPresent: boolean;
  highSeverityVulnerabilities: number;
  restoreDrillDocumented: boolean;
}

export interface LaunchGateResult {
  passed: boolean;
  checks: LaunchGateCheck[];
}

export function evaluateLaunchGates(input: LaunchGateInput): LaunchGateResult {
  const checks: LaunchGateCheck[] = [
    {
      id: "quality_checks",
      passed: input.qualityChecksPassed,
      detail: input.qualityChecksPassed
        ? "Lint, typecheck, unit tests, and Prisma validation passed."
        : "Quality gate failed.",
    },
    {
      id: "production_build",
      passed: input.buildPassed,
      detail: input.buildPassed
        ? "Production build succeeded."
        : "Production build failed.",
    },
    {
      id: "ai_eval_baseline",
      passed: input.evalPassed,
      detail: input.evalPassed
        ? "Classifier evaluation baseline passed."
        : "Classifier evaluation baseline failed.",
    },
    {
      id: "integration_suite",
      passed: input.integrationSuitePassed,
      detail: input.integrationSuitePassed
        ? "Tenant isolation, invites, cron, jobs, and quota integration tests passed."
        : "Integration suite failed.",
    },
    {
      id: "database_migrations",
      passed: input.migrationsPresent,
      detail: input.migrationsPresent
        ? "Prisma migrations are present."
        : "Missing Prisma migrations.",
    },
    {
      id: "operational_runbooks",
      passed: input.runbooksPresent,
      detail: input.runbooksPresent
        ? "Launch and service-level runbooks are present."
        : "Missing operational runbooks.",
    },
    {
      id: "load_budgets",
      passed: input.loadBudgetsPresent,
      detail: input.loadBudgetsPresent
        ? "Load budgets and k6 scenarios are defined."
        : "Missing load budget definitions.",
    },
    {
      id: "dependency_audit",
      passed: input.highSeverityVulnerabilities === 0,
      detail:
        input.highSeverityVulnerabilities === 0
          ? "No high-severity dependency findings recorded."
          : `${input.highSeverityVulnerabilities} high-severity dependency findings remain.`,
    },
    {
      id: "restore_drill",
      passed: input.restoreDrillDocumented,
      detail: input.restoreDrillDocumented
        ? "Backup restore drill documentation is present."
        : "Missing backup restore drill documentation.",
    },
  ];

  return {
    passed: checks.every((check) => check.passed),
    checks,
  };
}

export function summarizeLoadBudgets(): string {
  return [
    `public p95 <= ${LOAD_BUDGETS.public.latencyP95Ms}ms`,
    `api p95 <= ${LOAD_BUDGETS.api.latencyP95Ms}ms`,
    `classify p95 <= ${LOAD_BUDGETS.classify.latencyP95Ms}ms`,
  ].join(", ");
}
