import { expect, test } from "@playwright/test";
import {
  openShareDialog,
  readPilotManifest,
  waitForFrozenGraphStats,
} from "./pilot-helpers";

test.describe("pilot debate-map happy path", () => {
  test("loads a frozen graph, corrects an edge, and exposes debate export", async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    const manifest = readPilotManifest();
    await page.goto(`/explore?graph=${manifest.graphId}`);

    await expect(page.getByTestId("canvas-share-button")).toBeVisible({
      timeout: 60_000,
    });
    await waitForFrozenGraphStats(page, { graphId: manifest.graphId });

    const correction = await request.post("/api/classify/correct", {
      data: {
        citingId: "W100",
        citedId: "W200",
        edgeType: "contradicts",
        comment: "Pilot e2e correction",
      },
    });
    expect(correction.status()).toBe(200);
    const correctionBody = await correction.json();
    expect(correctionBody.success).toBe(true);
    expect(correctionBody.edgeType).toBe("contradicts");

    await openShareDialog(page);
    await expect(page.getByTestId("export-debate-report")).toBeVisible();

    const shareInput = page.getByTestId("share-frozen-link");
    await expect(shareInput).toHaveValue(/\/explore\?graph=[\w-]+/, {
      timeout: 30_000,
    });

    const reloaded = await page.goto(`/explore?graph=${manifest.graphId}`);
    expect(reloaded?.ok()).toBeTruthy();
    await waitForFrozenGraphStats(page, { graphId: manifest.graphId });
  });
});
