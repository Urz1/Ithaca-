#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env,
  });
  return result.status === 0;
}

const requiredPaths = [
  "docs/LAUNCH_RUNBOOK.md",
  "docs/SERVICE_LEVELS.md",
  "docs/PRODUCT_METRICS.md",
  "docs/launch/PILOT_CHECKLIST.md",
  "load/public-pages.js",
  "load/authenticated-api.js",
  "load/thresholds.js",
  "src/lib/platform/load-budgets.ts",
  "scripts/operations/restore-drill.sh",
  "scripts/operations/backup-checklist.md",
  "prisma/migrations",
];

const missingPaths = requiredPaths.filter(
  (path) => !existsSync(join(root, path)),
);
if (missingPaths.length > 0) {
  console.error("Missing required launch artifacts:");
  for (const path of missingPaths) {
    console.error(`- ${path}`);
  }
  process.exit(1);
}

const skipExecution = process.env.LAUNCH_CHECK_SKIP_COMMANDS === "1";
const buildEnv = {
  ...process.env,
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5434/ithaca_test",
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ?? "launch-check-launch-check-launch-check",
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  CRON_SECRET:
    process.env.CRON_SECRET ?? "launch-check-cron-secret-for-integration-tests",
  RUN_INTEGRATION_TESTS: "1",
};

const checks = [
  {
    id: "quality_checks",
    passed: skipExecution || run("npm", ["run", "check"], process.env),
  },
  {
    id: "ai_eval_baseline",
    passed: skipExecution || run("npm", ["run", "eval:ai"], process.env),
  },
  {
    id: "integration_suite",
    passed: skipExecution || run("npm", ["run", "test:integration"], buildEnv),
  },
  {
    id: "production_build",
    passed: skipExecution || run("npm", ["run", "build"], buildEnv),
  },
  {
    id: "launch_gate_tests",
    passed:
      skipExecution ||
      run(
        "npm",
        ["run", "test:unit", "--", "src/lib/platform/launch-gates.test.ts"],
        process.env,
      ),
  },
  {
    id: "load_budget_tests",
    passed:
      skipExecution ||
      run(
        "npm",
        ["run", "test:unit", "--", "src/lib/platform/load-budgets.test.ts"],
        process.env,
      ),
  },
];

const highSeverityVulnerabilities = Number(
  process.env.LAUNCH_CHECK_HIGH_VULNS ?? "0",
);
if (highSeverityVulnerabilities > 0) {
  checks.push({
    id: "dependency_audit",
    passed: false,
  });
}

const result = {
  passed: checks.every((check) => check.passed),
  checks,
};

console.log(JSON.stringify({ type: "launch_gate_result", ...result }, null, 2));

if (!result.passed) {
  process.exit(1);
}
