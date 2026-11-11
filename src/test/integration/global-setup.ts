import { execSync } from "node:child_process";

export default async function globalSetup() {
  if (!process.env.DATABASE_URL) return;

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: process.env,
  });
}
