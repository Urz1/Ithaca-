import { chromium } from "playwright";
import path from "path";

const outputDir = "/home/sadam/.gemini/antigravity/brain/9539f4f9-9978-4f77-b17f-6575462e97a9";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: "dark",
  });

  const page = await context.newPage();

  console.log("Navigating to http://localhost:3001...");
  await page.goto("http://localhost:3001", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const stickyStage = page.locator("div.sticky").first();
  await stickyStage.waitFor({ state: "visible", timeout: 8000 });
  await stickyStage.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);

  console.log("Capturing Isometric Deck (Dark Mode)...");
  await stickyStage.screenshot({
    path: path.join(outputDir, "isometric_deck_dark.png"),
  });

  await page.screenshot({
    path: path.join(outputDir, "isometric_deck_viewport_dark.png"),
    fullPage: false,
  });

  console.log("Switching to Light Mode...");
  await page.evaluate(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  });
  await page.waitForTimeout(1000);

  await stickyStage.screenshot({
    path: path.join(outputDir, "isometric_deck_light.png"),
  });

  console.log("Screenshots captured successfully!");
  await browser.close();
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
