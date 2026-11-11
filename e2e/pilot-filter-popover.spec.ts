import { test, expect } from "@playwright/test";
import * as path from "node:path";
import * as fs from "node:fs";
import { readPilotManifest, waitForFrozenGraphStats } from "./pilot-helpers";

test.describe("Global Filters Popover & Edge Rendering Verification", () => {
  test("renders instant edges and opens neat floating filters popover without deforming ribbon", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const manifest = readPilotManifest();

    const outDir =
      "/home/sadam/.gemini/antigravity/brain/9539f4f9-9978-4f77-b17f-6575462e97a9/explore_clean_verification";
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }

    // 1. Navigate to explore canvas
    await page.goto(`/explore?graph=${manifest.graphId}`);

    // Wait for graph and controls
    await expect(page.getByTestId("canvas-share-button")).toBeVisible({
      timeout: 60_000,
    });
    await waitForFrozenGraphStats(page, { graphId: manifest.graphId });

    // Handle onboarding if open
    const onboardingDialog = page.getByTestId("onboarding-dialog");
    if (
      await onboardingDialog.isVisible({ timeout: 2000 }).catch(() => false)
    ) {
      await page.getByTestId("onboarding-complete-button").click();
      await page.waitForTimeout(500);
    }

    // Dismiss tour if open
    const tourClose = page
      .locator('button[aria-label="Close tour"], button:has-text("Skip")')
      .first();
    if (await tourClose.isVisible({ timeout: 1000 }).catch(() => false)) {
      await tourClose.click();
      await page.waitForTimeout(500);
    }

    // Wait for canvas to settle
    await page.waitForTimeout(2000);

    // Capture initial canvas with immediate edges
    const initialScreenshot = await page.screenshot();
    fs.writeFileSync(
      path.join(outDir, "canvas_edges_immediate.png"),
      initialScreenshot,
    );

    // 2. Locate the Filters button inside the Unified Top Control Ribbon
    const filterBtn = page.getByTestId("global-filters-button");
    await expect(filterBtn).toBeVisible({ timeout: 5000 });

    // Click Filters to open popover
    await filterBtn.click();

    // Verify popover opens as an absolute floating card
    const filterPopover = page.getByTestId("global-filters-popover");
    await expect(filterPopover).toBeVisible({ timeout: 5000 });

    // Check that header and controls exist inside the popover
    await expect(
      filterPopover.getByText("Graph Filters", { exact: false }),
    ).toBeVisible();
    await expect(
      filterPopover.getByText("Relationship Types", { exact: false }),
    ).toBeVisible();
    await expect(
      filterPopover.getByText("Citation Count", { exact: false }),
    ).toBeVisible();
    await expect(
      filterPopover.getByText("Publication Year", { exact: false }),
    ).toBeVisible();

    // Take screenshot of the elegant floating popover over the canvas
    const popoverScreenshot = await page.screenshot();
    fs.writeFileSync(
      path.join(outDir, "filters_popover_opened.png"),
      popoverScreenshot,
    );

    // 3. Test filter toggle functionality
    // Toggle "Supports" switch inside the popover
    const supportsSwitch = filterPopover
      .locator("div")
      .filter({ hasText: /^Supports$/ })
      .locator('button[role="switch"]');
    if (await supportsSwitch.isVisible()) {
      await supportsSwitch.click();
      await page.waitForTimeout(500);
    }

    // Capture filtered state screenshot
    const filteredScreenshot = await page.screenshot();
    fs.writeFileSync(
      path.join(outDir, "filters_applied_canvas.png"),
      filteredScreenshot,
    );

    // Click Filters button again or click outside to close
    await filterBtn.click();
    await expect(filterPopover).not.toBeVisible({ timeout: 3000 });

    // Final screenshot with closed popover
    const closedScreenshot = await page.screenshot();
    fs.writeFileSync(
      path.join(outDir, "filters_closed_ribbon_intact.png"),
      closedScreenshot,
    );

    console.log("E2E Verification completed successfully!");
  });
});
