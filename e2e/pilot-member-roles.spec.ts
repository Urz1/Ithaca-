import { expect, test } from "@playwright/test";
import { readPilotManifest } from "./pilot-helpers";

test.describe("pilot role authz — member", () => {
  test("allows members to correct edges and post comments", async ({
    request,
  }) => {
    const manifest = readPilotManifest();

    const correction = await request.post("/api/classify/correct", {
      data: {
        citingId: "W100",
        citedId: "W200",
        edgeType: "supports",
        comment: "Member e2e correction",
      },
    });
    expect(correction.status()).toBe(200);

    const comment = await request.post("/api/edges/comments", {
      data: {
        citingId: "W100",
        citedId: "W200",
        body: "Member team note from e2e",
        edgeType: "supports",
      },
    });
    expect(comment.status()).toBe(200);
    const payload = await comment.json();
    expect(payload.comment.body).toBe("Member team note from e2e");
    expect(manifest.memberEmail).toContain("@");
  });
});
