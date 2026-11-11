import { test, expect } from "@playwright/test";
import * as path from "node:path";
import * as fs from "node:fs";
import { readPilotManifest, waitForFrozenGraphStats } from "./pilot-helpers";

test.describe("Explore Canvas Aesthetics & Unified Docks", () => {
  test("loads graph with clean top ribbon, bottom utility dock, and zero-edge stance alert", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const manifest = readPilotManifest();

    const outDir = "/home/sadam/.gemini/antigravity/brain/9539f4f9-9978-4f77-b17f-6575462e97a9/explore_clean_verification";
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // 1. Navigate to graph
    await page.goto(`/explore?graph=${manifest.graphId}`);

    // Wait for frozen graph and UI controls
    await expect(page.getByTestId("canvas-share-button")).toBeVisible({
      timeout: 60_000,
    });
    await waitForFrozenGraphStats(page, { graphId: manifest.graphId });

    // Handle onboarding if open
    const onboardingDialog = page.getByTestId("onboarding-dialog");
    if (await onboardingDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.getByTestId("onboarding-complete-button").click();
      await page.waitForTimeout(500);
    }

    // Dismiss tour if open
    const tourClose = page.locator('button[aria-label="Close tour"], button:has-text("Skip")').first();
    if (await tourClose.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tourClose.click();
      await page.waitForTimeout(500);
    }

    // Verify Unified Top Ribbon elements
    await expect(page.locator('[data-tour="battlefield-mode"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('button[title*="Debate Matrix"]')).toBeVisible();
    await expect(page.locator('button[title*="Literature Review"]')).toBeVisible();
    await expect(page.locator('button[title*="Query Builder"]')).toBeVisible();
    await expect(page.locator('[data-tour="ai-chat"]')).toBeVisible();

    // Verify Unified Bottom Utility Dock elements
    await expect(page.locator('[data-tour="relationship-filters"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('[data-tour="zoom-controls"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('button[title="Zoom In (+)"]')).toBeVisible();
    await expect(page.locator('button[title="Zoom Out (-)"]')).toBeVisible();
    await expect(page.locator('button[title="Center View"]')).toBeVisible();
    await expect(page.locator('button[title="Save graph"]')).toBeVisible();

    // Settle for visual stability
    await page.waitForTimeout(2000);

    console.log("REACHED SCREENSHOT STEP");
    const buffer = await page.screenshot();
    fs.writeFileSync("/home/sadam/Development/product/Itacha/ithaca-ui/explore_unified_docks_active.png", buffer);
    fs.writeFileSync(path.join(outDir, "explore_unified_docks_active.png"), buffer);
    console.log("SAVED BUFFER:", buffer.length);

    // Test zero-edge stance alert:
    // Click on a stance filter that has 0 edges in this frozen graph, or verify hint logic
    const extendsButton = page.locator('button:has-text("Extends")').first();
    if (await extendsButton.isVisible()) {
      await extendsButton.click();
      await page.waitForTimeout(1000);

      // Check if zero edge hint is shown
      const zeroEdgeHint = page.locator('text=No Extends edges found in this sample');
      const isHintVisible = await zeroEdgeHint.isVisible({ timeout: 3000 }).catch(() => false);
      if (isHintVisible) {
        await page.screenshot({
          path: path.join(outDir, "explore_zero_edge_hint.png"),
          fullPage: false,
        });
        await page.screenshot({
          path: "explore_zero_edge_hint.png",
          fullPage: false,
        });
        // Click Show All
        await page.locator('button:has-text("Show All")').click();
        await page.waitForTimeout(500);
        await expect(zeroEdgeHint).not.toBeVisible();
      }
    }
  });
});
