import { expect, test } from "@playwright/test";

test.describe("pilot role authz — viewer", () => {
  test("blocks viewers from correcting edges or posting comments", async ({
    request,
  }) => {
    const correction = await request.post("/api/classify/correct", {
      data: {
        citingId: "W100",
        citedId: "W200",
        edgeType: "contradicts",
      },
    });
    expect(correction.status()).toBe(401);

    const comment = await request.post("/api/edges/comments", {
      data: {
        citingId: "W100",
        citedId: "W200",
        body: "Viewer note should fail",
      },
    });
    expect(comment.status()).toBe(401);
  });
});
