#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const scenario = process.env.LOAD_SCENARIO ?? "public-pages";

const scenarios = {
  "public-pages": "load/public-pages.js",
  "health-and-public": "load/health-and-public.js",
  "authenticated-api": "load/authenticated-api.js",
};

const scriptPath = scenarios[scenario];
if (!scriptPath) {
  console.error(`Unknown LOAD_SCENARIO "${scenario}".`);
  process.exit(1);
}

const k6 = spawnSync("k6", ["version"], { stdio: "pipe" });
if (k6.status !== 0) {
  console.error(
    "k6 is not installed. See load/README.md for setup instructions.",
  );
  process.exit(1);
}

if (!existsSync(join(root, scriptPath))) {
  console.error(`Missing load script: ${scriptPath}`);
  process.exit(1);
}

const result = spawnSync("k6", ["run", join(root, scriptPath)], {
  cwd: root,
  stdio: "inherit",
  env: {
    ...process.env,
    BASE_URL: baseUrl,
  },
});

process.exit(result.status ?? 1);
