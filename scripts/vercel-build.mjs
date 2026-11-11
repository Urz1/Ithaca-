#!/usr/bin/env node
import { execSync } from "node:child_process";

console.log("\n🚀 [Vercel Deployment] Initiating Ithaca build pipeline...\n");

// 1. Prisma Client Generation
console.log("📦 Generating Prisma client...");
execSync("npx prisma generate", { stdio: "inherit" });

// 2. Database Migrations (Only executed if DATABASE_URL is set and reachable)
if (process.env.DATABASE_URL) {
  console.log("🗄️ DATABASE_URL detected. Executing Prisma schema migrations...");
  try {
    execSync("npx prisma migrate deploy", { stdio: "inherit" });
    console.log("✅ Database migrations applied successfully.\n");
  } catch (error) {
    console.warn("⚠️ Warning: Prisma migrate deploy failed or database unreachable during build.");
    console.warn("   Proceeding with Next.js build. Ensure migrations are applied post-deploy.");
  }
} else {
  console.log("ℹ️ No DATABASE_URL found during build step. Skipping automatic migrations.\n");
}

// 3. Next.js Build
console.log("⚡ Building Next.js application...");
execSync("npx next build", { stdio: "inherit" });
console.log("🎉 Ithaca production build complete.\n");
