import { expect, test } from "@playwright/test";
import { readPilotManifest, signInPilotUser } from "./pilot-helpers";

test.describe("pilot onboarding literacy", () => {
  test.beforeEach(async ({ page }) => {
    const manifest = readPilotManifest();
    const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000";
    await page.context().addCookies([
      {
        name: "ithaca_org_id",
        value: manifest.organizationId,
        domain: new URL(baseURL).hostname,
        path: "/",
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  });

  test("shows the graph literacy dialog once and persists completion", async ({
    page,
  }) => {
    test.setTimeout(90_000);

    await page.goto("/explore");
    const dialog = page.getByTestId("onboarding-dialog");
    await expect(dialog).toBeVisible({ timeout: 60_000 });
    await expect(dialog.getByText("How to read the Dialectic Graph")).toBeVisible();

    await page.getByTestId("onboarding-complete-button").click();
    await expect(dialog).not.toBeVisible();

    await page.reload();
    await expect(page.getByRole("link", { name: "Explore" })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("onboarding-dialog")).not.toBeVisible();
  });

  test("explore page renders clean zero-state without congestion and active controls upon loading graph", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const fs = await import("fs");
    const path = await import("path");
    const outDir = "/home/sadam/.gemini/antigravity/brain/9539f4f9-9978-4f77-b17f-6575462e97a9/explore_clean_verification";
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    await page.goto("/explore");
    const onboardingDialog = page.getByTestId("onboarding-dialog");
    try {
      await expect(onboardingDialog).toBeVisible({ timeout: 5000 });
      await page.getByTestId("onboarding-complete-button").click();
      await expect(onboardingDialog).not.toBeVisible({ timeout: 5000 });
    } catch {
      // already completed onboarding or not displayed
    }

    // If new-user tour card is active, skip tour to enter undisturbed zero-state
    const skipTour = page.locator("text=Skip Tour");
    if (await skipTour.isVisible().catch(() => false)) {
      await skipTour.click();
      await page.waitForTimeout(500);
    }

    // 1. Verify Command Bar Pill (⌘K) is visible in the top header
    const commandPill = page.locator('[data-tour="search"]');
    await expect(commandPill).toBeVisible();

    // 2. Verify Graph inspection tools are NOT visible in zero-state
    const zoomControls = page.locator('[data-tour="zoom-controls"]');
    await expect(zoomControls).not.toBeVisible();

    const battlefieldBottom = page.locator('[data-tour="battlefield-mode"]');
    await expect(battlefieldBottom).not.toBeVisible();

    // 3. Verify curated debates starter section is visible and clean
    const curatedDebates = page.locator('[data-tour="curated-debates"]');
    await expect(curatedDebates).toBeVisible();

    // Capture clean zero-state screenshot
    await page.screenshot({
      path: path.join(outDir, "explore_zero_state_clean.png"),
      fullPage: false,
    });

    // 4. Click a starter debate card to activate graph
    const starterCard = page.locator("text=How do transformers handle long context?").first();
    await starterCard.click();
    await page.waitForTimeout(4000);

    // 5. Verify graph controls now reveal themselves cleanly
    await expect(zoomControls).toBeVisible({ timeout: 20_000 });
    await expect(battlefieldBottom).toBeVisible();

    // Capture active-state screenshot
    await page.screenshot({
      path: path.join(outDir, "explore_active_graph.png"),
      fullPage: false,
    });
  });
});

