#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:3000";
const email = process.env.PILOT_EMAIL ?? "pilot-owner@ithaca.test";
const password = process.env.PILOT_PASSWORD ?? "PilotPass123!";

function signIn() {
  const response = spawnSync(
    "curl",
    [
      "-sS",
      "-X",
      "POST",
      `${baseUrl}/api/auth/sign-in/email`,
      "-H",
      "Content-Type: application/json",
      "-D",
      "-",
      "-o",
      "/dev/null",
      "-d",
      JSON.stringify({ email, password }),
    ],
    { encoding: "utf8" },
  );

  if (response.status !== 0) {
    throw new Error(`Sign-in request failed: ${response.stderr}`);
  }

  const setCookie = response.stdout
    .split("\n")
    .find((line) =>
      line.toLowerCase().startsWith("set-cookie: ithaca.session_token="),
    );

  if (!setCookie) {
    throw new Error("Could not find ithaca.session_token in sign-in response");
  }

  const cookiePair = setCookie.slice("set-cookie:".length).trim().split(";")[0];

  return cookiePair;
}

function readOrgCookie() {
  const manifestPath = join(root, "e2e", ".seed", "pilot.json");
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (manifest.organizationId) {
      return `ithaca_org_id=${manifest.organizationId}`;
    }
  } catch {
    // Optional when seed manifest is unavailable.
  }
  return null;
}

const sessionToken = signIn();
const orgCookie = readOrgCookie();
const cookieHeader = orgCookie ? `${sessionToken}; ${orgCookie}` : sessionToken;

console.log(`SESSION_COOKIE="${cookieHeader}"`);
