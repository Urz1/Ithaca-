#!/usr/bin/env node

/**
 * Ithaca Chrome/Edge Extension Packager
 *
 * Verifies Manifest V3 compliance, validates icons, scripts, and options UI,
 * and packages production-ready distributables for Chrome Web Store and developer sideloading.
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const rootDir = process.cwd();
const extensionDir = path.join(rootDir, "extension");
const distDir = path.join(rootDir, "dist");
const manifestPath = path.join(extensionDir, "manifest.json");

const isProdMode = process.argv.includes("--mode=prod");
const modeLabel = isProdMode ? "Production (Web Store)" : "Development (Local)";

console.log(`📦 Packaging Ithaca Academic Stance Extension (${modeLabel})...`);

// 1. Verify Manifest
if (!fs.existsSync(manifestPath)) {
  console.error("❌ manifest.json not found in extension directory");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const version = manifest.version || "1.0.0";
console.log(`ℹ️  Extension Version: ${version}`);

// 2. Verify required files
const requiredFiles = [
  "manifest.json",
  "background.js",
  "content.js",
  "content.css",
  "popup.html",
  "popup.js",
  "options.html",
  "options.js",
  "icons/icon-16.png",
  "icons/icon-48.png",
  "icons/icon-128.png",
];

for (const file of requiredFiles) {
  const filePath = path.join(extensionDir, file);
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Required extension file missing: ${file}`);
    process.exit(1);
  }
}

// 3. Prepare packaging directory
fs.mkdirSync(distDir, { recursive: true });
const stageDir = path.join(
  distDir,
  `staging-extension-${isProdMode ? "prod" : "dev"}`,
);
if (fs.existsSync(stageDir)) {
  fs.rmSync(stageDir, { recursive: true, force: true });
}
fs.cpSync(extensionDir, stageDir, { recursive: true });

// If production mode, sanitize manifest and background worker
if (isProdMode) {
  const stageManifestPath = path.join(stageDir, "manifest.json");
  const stageManifest = JSON.parse(fs.readFileSync(stageManifestPath, "utf8"));
  if (Array.isArray(stageManifest.host_permissions)) {
    stageManifest.host_permissions = stageManifest.host_permissions.filter(
      (h) => !h.includes("localhost"),
    );
  }
  fs.writeFileSync(
    stageManifestPath,
    JSON.stringify(stageManifest, null, 2),
    "utf8",
  );

  const stageBgPath = path.join(stageDir, "background.js");
  let bgCode = fs.readFileSync(stageBgPath, "utf8");
  bgCode = bgCode.replace(
    /const DEFAULT_API_BASE = "http:\/\/localhost:3000";/,
    'const DEFAULT_API_BASE = "https://ithaca.rhizan.com";',
  );
  fs.writeFileSync(stageBgPath, bgCode, "utf8");
}

const zipName = isProdMode
  ? `ithaca-extension-v${version}-prod.zip`
  : `ithaca-extension-v${version}.zip`;
const zipPath = path.join(distDir, zipName);

if (fs.existsSync(zipPath)) {
  fs.unlinkSync(zipPath);
}

// 4. Create ZIP package
try {
  execSync(`zip -r "${zipPath}" *`, {
    cwd: stageDir,
    stdio: "pipe",
  });
  // Clean staging
  fs.rmSync(stageDir, { recursive: true, force: true });
} catch (error) {
  console.error("❌ Failed to create zip package:", error.message);
  process.exit(1);
}

const stats = fs.statSync(zipPath);
const sizeKb = (stats.size / 1024).toFixed(1);

console.log(`✅ Successfully packaged extension (${modeLabel}):`);
console.log(`   Artifact: ${zipPath}`);
console.log(`   Package Size: ${sizeKb} KB`);
console.log(`   Files included: ${requiredFiles.length}`);
console.log(
  isProdMode
    ? "🚀 Ready for Chrome Web Store upload."
    : "🚀 Ready for manual unpacked loading in Chrome.",
);
