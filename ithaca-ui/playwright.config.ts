import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
const isLocalBase =
  baseURL.includes("127.0.0.1") || baseURL.includes("localhost");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: isLocalBase
    ? {
        command: "npm run dev",
        url: "http://127.0.0.1:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        env: {
          DATABASE_URL:
            process.env.DATABASE_URL ??
            "postgresql://postgres:postgres@localhost:5434/ithaca_test",
          BETTER_AUTH_SECRET:
            process.env.BETTER_AUTH_SECRET ??
            "test-test-test-test-test-test-test-test-test-test",
          BETTER_AUTH_URL:
            process.env.BETTER_AUTH_URL ?? baseURL.replace(/\/$/, ""),
          NEXT_PUBLIC_APP_URL:
            process.env.NEXT_PUBLIC_APP_URL ?? baseURL.replace(/\/$/, ""),
          NEXT_PUBLIC_E2E: "1",
        },
      }
    : undefined,
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "smoke",
      testMatch: /(public-smoke|pilot-readiness)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "pilot",
      testMatch: /pilot-(happy-path|depth|digest|aesthetic|filter-popover)\.spec\.ts/,
      dependencies: ["setup"],
      retries: process.env.CI ? 2 : 1,
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/pilot-owner.json",
      },
    },
    {
      name: "pilot-member",
      testMatch: /pilot-member-roles\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/pilot-member.json",
      },
    },
    {
      name: "pilot-viewer",
      testMatch: /pilot-viewer-roles\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/pilot-viewer.json",
      },
    },
    {
      name: "pilot-onboarding",
      testMatch: /pilot-onboarding\.spec\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "e2e/.auth/pilot-onboarding.json",
      },
    },
  ],
});
