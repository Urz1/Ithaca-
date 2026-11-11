import { expect, test } from "@playwright/test";

test.describe("public application", () => {
  test("renders the landing page and exposes authentication", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/Ithaca/i);
    await expect(
      page
        .getByRole("link", { name: "Sign In" })
        .or(page.getByRole("button", { name: /create free account/i })),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("redirects an unauthenticated workspace request to sign in", async ({
    page,
  }) => {
    await page.goto("/explore");

    await expect(page).toHaveURL(/\/signin\?callbackUrl=/);
  });

  test("publishes a health endpoint contract", async ({ request }) => {
    const response = await request.get("/api/health");

    expect([200, 503]).toContain(response.status());
    expect(response.headers()["content-type"]).toMatch(/application\/json/);
  });
});
