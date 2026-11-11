import { expect, test } from "@playwright/test";
import { readPilotManifest, waitForFrozenGraphStats } from "./pilot-helpers";

test.describe("pilot digest deep link", () => {
  test("loads a watched collection explore URL with graph stats", async ({
    page,
  }) => {
    test.setTimeout(90_000);
    const manifest = readPilotManifest();

    await page.goto(`/explore?collection=${manifest.collectionId}`);
    await expect(page.getByTestId("canvas-share-button")).toBeVisible({
      timeout: 60_000,
    });
    await waitForFrozenGraphStats(page, {
      collectionId: manifest.collectionId,
    });
  });
});
