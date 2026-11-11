import { expect, request as playwrightRequest } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface PilotManifest {
  graphId: string;
  collectionId: string;
  organizationId: string;
  onboardingEmail: string;
  sharedPassword: string;
  ownerEmail: string;
  memberEmail: string;
  viewerEmail: string;
  storageStatePath: string;
  memberStorageStatePath: string;
  viewerStorageStatePath: string;
  onboardingStorageStatePath: string;
}

export function readPilotManifest(): PilotManifest {
  return JSON.parse(
    readFileSync(join(process.cwd(), "e2e/.seed/pilot.json"), "utf8"),
  ) as PilotManifest;
}

export async function signInPilotUser(
  page: import("@playwright/test").Page,
  input: {
    email: string;
    password: string;
    organizationId: string;
  },
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
    console.error(
      `Sign-in failed for ${input.email}: status ${signInResponse.status()} - ${await signInResponse.text()}`,
    );
  }
  expect(signInResponse.ok()).toBeTruthy();

  const authenticatedState = await isolated.storageState();
  await page.context().clearCookies();
  await page.context().addCookies(authenticatedState.cookies);
  await page.context().addCookies([
    {
      name: "ithaca_org_id",
      value: input.organizationId,
      domain: new URL(baseURL).hostname,
      path: "/",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await isolated.dispose();
}

export async function waitForFrozenGraphStats(
  page: import("@playwright/test").Page,
  target: { graphId?: string; collectionId?: string },
  expectedNodes = 2,
  expectedEdges = 1,
) {
  const nodes = page.getByTestId("canvas-node-count");
  const edges = page.getByTestId("canvas-edge-count");
  const explorePath = target.collectionId
    ? `/explore?collection=${target.collectionId}`
    : `/explore?graph=${target.graphId}`;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (attempt > 0) {
      await page.goto(explorePath);
      await expect(page.getByTestId("canvas-share-button")).toBeVisible({
        timeout: 60_000,
      });
    }

    try {
      await expect(nodes).toHaveText(new RegExp(`${expectedNodes} nodes`), {
        timeout: 45_000,
      });
      await expect(edges).toHaveText(new RegExp(`${expectedEdges} edges`), {
        timeout: 5_000,
      });
      return;
    } catch (error) {
      if (attempt === 1) throw error;
    }
  }
}

export async function dismissEdgeEvidencePopover(
  page: import("@playwright/test").Page,
) {
  const popover = page.getByTestId("edge-evidence-popover");
  if (await popover.isVisible().catch(() => false)) {
    await page.getByTestId("edge-evidence-close").click();
    await expect(popover).not.toBeVisible();
  }
}

export async function openShareDialog(page: import("@playwright/test").Page) {
  await dismissEdgeEvidencePopover(page);
  await page.getByTestId("canvas-share-button").click();
  await expect(page.getByTestId("share-dialog")).toBeVisible();
}
