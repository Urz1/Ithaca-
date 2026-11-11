import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  openShareDialog,
  readPilotManifest,
  waitForFrozenGraphStats,
} from "./pilot-helpers";

test.describe("pilot debate-map depth", () => {
  test("shows edge evidence and exports a debate report with contested language", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    const manifest = readPilotManifest();

    await page.goto(`/explore?graph=${manifest.graphId}&e2eEdge=e-pilot-1`);
    await expect(page.getByTestId("canvas-share-button")).toBeVisible({
      timeout: 60_000,
    });
    await waitForFrozenGraphStats(page, { graphId: manifest.graphId });

    await expect(page.getByTestId("edge-evidence-popover")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("edge-evidence-popover")).toContainText(
      /conflict with the cited work/i,
    );

    await openShareDialog(page);

    const downloadPromise = page.waitForEvent("download");
    await page.getByTestId("export-debate-report").click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    const reportText = readFileSync(downloadPath!, "utf8");
    expect(reportText.toLowerCase()).toMatch(/contradict|contested|conflict/);
    expect(download.suggestedFilename()).toMatch(/\.md$/i);
  });
});
