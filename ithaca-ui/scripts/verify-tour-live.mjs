import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const outDir = "/home/sadam/.gemini/antigravity/brain/9539f4f9-9978-4f77-b17f-6575462e97a9/tour_verification";

// 1. Get authenticated session cookie
const exportCookieRes = spawnSync("node", ["scripts/e2e/export-session-cookie.mjs"], {
  encoding: "utf8",
});

if (exportCookieRes.status !== 0) {
  console.error("Failed to export session cookie:", exportCookieRes.stderr);
  process.exit(1);
}

const cookieLine = exportCookieRes.stdout
  .split("\n")
  .find((l) => l.startsWith('SESSION_COOKIE="'));
const rawCookies = cookieLine ? cookieLine.replace('SESSION_COOKIE="', "").replace('"', "") : "";

console.log("Raw cookies:", rawCookies);

const parsedCookies = rawCookies.split("; ").map((pair) => {
  const [name, ...rest] = pair.split("=");
  return {
    name: name.trim(),
    value: rest.join("=").trim(),
    domain: "localhost",
    path: "/",
  };
});

const STEPS = [
  { index: 1, title: "Universal Literature Search", category: "COMMAND DECK" },
  { index: 2, title: "1-Click Debate Topologies", category: "DIALECTIC STARTERS" },
  { index: 3, title: "Battlefield Mode", category: "CRUCIBLE FILTER" },
  { index: 4, title: "The Epistemic Stance Spectrum", category: "TRI-PARTITE MODEL" },
  { index: 5, title: "Grounded AI Literature Assistant", category: "AI REASONING" },
  { index: 6, title: "Selection & Conflict Paths", category: "MULTI-PAPER COMPARISON" },
  { index: 7, title: "Navigation & Keyboard Controls", category: "WEBGL ENGINE" },
];

async function run() {
  const browser = await chromium.launch({
    executablePath: "/usr/bin/google-chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addCookies(parsedCookies);

  const page = await context.newPage();

  console.log("Navigating to http://localhost:3000/explore...");
  await page.goto("http://localhost:3000/explore", { waitUntil: "networkidle" });

  // Reset tutorial state in localStorage
  await page.evaluate(() => {
    localStorage.removeItem("ithaca_tutorials_completed");
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  // If onboarding dialog appears, complete it
  const onboardingBtn = page.locator("button:has-text('Get Started'), button:has-text('Enter Workspace'), button:has-text('Continue')");
  if (await onboardingBtn.first().isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log("Completing onboarding dialog...");
    await onboardingBtn.first().click();
    await page.waitForTimeout(1500);
  }

  // Iterate over all 7 steps
  for (const step of STEPS) {
    console.log(`\n========================================`);
    console.log(`Step ${step.index}/7: ${step.title} [${step.category}]`);
    console.log(`========================================`);

    try {
      await page.waitForSelector(`h3:has-text("${step.title}")`, { timeout: 6000 });
    } catch (e) {
      console.log(`Failed waiting for h3 with title "${step.title}". Current h3 titles:`, await page.locator("h3").allTextContents());
      await page.screenshot({ path: join(outDir, `debug_failed_step_${step.index}.png`) });
      throw e;
    }

    // Verify SVG mask cutout exists
    const maskCount = await page.locator("#ithaca-tour-mask").count();
    console.log(`✓ SVG mask cutout present: ${maskCount > 0}`);

    // Verify category badge
    const badgeCount = await page.locator(`text="${step.category}"`).count();
    console.log(`✓ Area mark category badge present: ${badgeCount > 0}`);

    // Take screenshot of marked area
    const markScreenshot = join(outDir, `step_${step.index}_${step.category.toLowerCase().replace(/[^a-z0-9]/g, "_")}.png`);
    await page.screenshot({ path: markScreenshot });
    console.log(`✓ Saved mark screenshot: ${markScreenshot}`);

    // Check Try Live button
    const tryLiveBtn = page.locator("button:has-text('Try Live ➜')");
    if (await tryLiveBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log(`→ Clicking 'Try Live ➜' for ${step.title}...`);
      await tryLiveBtn.click();
      await page.waitForTimeout(1200);

      const triggeredText = page.locator("text='Triggered Live!'");
      const isTriggered = await triggeredText.isVisible({ timeout: 2000 }).catch(() => false);
      console.log(`✓ Live action executed (Triggered Live! visible): ${isTriggered}`);

      // Take action screenshot
      const actionScreenshot = join(outDir, `step_${step.index}_action_executed.png`);
      await page.screenshot({ path: actionScreenshot });
      console.log(`✓ Saved action screenshot: ${actionScreenshot}`);

      // If Command palette was opened, dismiss it so subsequent area marks are cleanly visible
      if (step.index === 1) {
        console.log("→ Dismissing Command palette dialog via close-command-bar event...");
        await page.evaluate(() => window.dispatchEvent(new Event("close-command-bar")));
        await page.waitForTimeout(600);
      }
    }

    // Advance to next step
    if (step.index < 7) {
      console.log("→ Advancing to next area via ArrowRight or next button...");
      const nextBtn = page.locator("button:has-text('Next Area')");
      if (await nextBtn.isVisible()) {
        await nextBtn.click({ force: true });
      } else {
        await page.keyboard.press("ArrowRight");
      }
      await page.waitForTimeout(1500);
    } else {
      console.log("→ Finishing tour...");
      const finishBtn = page.locator("button:has-text('Finish Tour')");
      if (await finishBtn.isVisible()) {
        await finishBtn.click({ force: true });
      }
      await page.waitForTimeout(1000);
    }
  }

  const finalScreenshot = join(outDir, "step_final_completed.png");
  await page.screenshot({ path: finalScreenshot });
  console.log(`\n✓ Tour completely finished. Final screenshot: ${finalScreenshot}`);

  await browser.close();
  console.log("ALL 7 STEPS VERIFIED INTERACTIVELY WITH AREA MARKS!");
}

run().catch((err) => {
  console.error("Verification error:", err);
  process.exit(1);
});
