import { expect, test } from "@playwright/test";

test.describe("pilot readiness surfaces", () => {
  test("publishes operational status and documentation pages", async ({
    page,
  }) => {
    await page.goto("/status");
    await expect(
      page.getByRole("heading", { name: "System Status" }),
    ).toBeVisible();

    await page.goto("/docs");
    await expect(
      page.getByRole("heading", { name: "Documentation" }),
    ).toBeVisible();
  });

  test("requires authentication for pilot workspace routes", async ({
    page,
  }) => {
    await page.goto("/projects");
    await expect(page).toHaveURL(/\/signin\?callbackUrl=/);

    await page.goto("/admin");
    await expect(page).toHaveURL(/\/signin\?callbackUrl=/);
  });

  test("classify API rejects unauthenticated pilot workflow calls", async ({
    request,
  }) => {
    const response = await request.post("/api/classify", {
      data: {
        citations: [
          {
            citingId: "W123",
            citedId: "W456",
            citingTitle: "Pilot citing paper",
            citingAbstract: "Synthetic abstract.",
            citedTitle: "Pilot cited paper",
            citedAbstract: "Synthetic cited abstract.",
          },
        ],
      },
    });

    expect([401, 403]).toContain(response.status());
  });
});
