import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  expect,
  request as playwrightRequest,
  test as setup,
} from "@playwright/test";

const testDatabaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5434/ithaca_test";

interface PilotManifest {
  ownerEmail: string;
  ownerPassword: string;
  memberEmail: string;
  viewerEmail: string;
  onboardingEmail: string;
  sharedPassword: string;
  organizationId: string;
  storageStatePath: string;
  memberStorageStatePath: string;
  viewerStorageStatePath: string;
  onboardingStorageStatePath: string;
}

function cookieDomain(): string {
  const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
  return new URL(base).hostname;
}

function readManifest(): PilotManifest {
  return JSON.parse(
    readFileSync(join(process.cwd(), "e2e/.seed/pilot.json"), "utf8"),
  ) as PilotManifest;
}

async function authenticatePilotUser(
  page: import("@playwright/test").Page,
  manifest: PilotManifest,
  input: { email: string; password: string; storageStatePath: string },
) {
  const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
  const isolated = await playwrightRequest.newContext({ baseURL });
  const signInResponse = await isolated.post("/api/auth/sign-in/email", {
    data: {
      email: input.email,
      password: input.password,
    },
  });
  if (!signInResponse.ok()) {
    console.error("Sign-in failed for", input.email, signInResponse.status(), await signInResponse.text());
  }
  expect(signInResponse.ok()).toBeTruthy();

  const authenticatedState = await isolated.storageState();
  await page.context().clearCookies();
  await page.context().addCookies(authenticatedState.cookies);
  await page.context().addCookies([
    {
      name: "ithaca_org_id",
      value: manifest.organizationId,
      domain: cookieDomain(),
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/explore");
  await expect(page.getByRole("link", { name: "Explore" })).toBeVisible({
    timeout: 30_000,
  });

  await page.context().storageState({
    path: join(process.cwd(), input.storageStatePath),
  });
  await isolated.dispose();
}

setup.describe.configure({ mode: "serial" });

setup("seed pilot fixtures", async () => {
  const seedTargets = [
    testDatabaseUrl,
    process.env.DATABASE_URL ??
      "postgresql://postgres:ithaca_production_secret_2026@localhost:5434/ithaca_db?schema=public",
  ];
  for (const dbUrl of seedTargets) {
    try {
      execSync("node scripts/e2e/seed-pilot.mjs", {
        cwd: process.cwd(),
        stdio: "inherit",
        env: {
          ...process.env,
          DATABASE_URL: dbUrl,
        },
      });
    } catch {
      // Ignore if one database is not reachable
    }
  }
});

setup("authenticate pilot owner", async ({ page }) => {
  setup.setTimeout(60_000);
  const manifest = readManifest();

  await authenticatePilotUser(page, manifest, {
    email: manifest.ownerEmail,
    password: manifest.ownerPassword,
    storageStatePath: manifest.storageStatePath,
  });
});

setup("authenticate pilot member", async ({ page }) => {
  setup.setTimeout(60_000);
  const manifest = readManifest();

  await authenticatePilotUser(page, manifest, {
    email: manifest.memberEmail,
    password: manifest.sharedPassword,
    storageStatePath: manifest.memberStorageStatePath,
  });
});

setup("authenticate pilot viewer", async ({ page }) => {
  setup.setTimeout(60_000);
  const manifest = readManifest();

  await authenticatePilotUser(page, manifest, {
    email: manifest.viewerEmail,
    password: manifest.sharedPassword,
    storageStatePath: manifest.viewerStorageStatePath,
  });
});

setup("authenticate pilot onboarding", async ({ page }) => {
  setup.setTimeout(60_000);
  const manifest = readManifest();

  await authenticatePilotUser(page, manifest, {
    email: manifest.onboardingEmail,
    password: manifest.sharedPassword,
    storageStatePath: manifest.onboardingStorageStatePath,
  });
});
