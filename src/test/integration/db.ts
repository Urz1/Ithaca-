import { PrismaClient } from "@prisma/client";

let testPrisma: PrismaClient | undefined;

export function getTestPrisma(): PrismaClient {
  if (!testPrisma) {
    testPrisma = new PrismaClient({
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
    });
  }
  return testPrisma;
}

export function canRunIntegrationTests(): boolean {
  return Boolean(
    process.env.RUN_INTEGRATION_TESTS === "1" && process.env.DATABASE_URL,
  );
}

const TRUNCATE_TABLES = [
  "edge_comment",
  "ai_usage_record",
  "stored_artifact",
  "background_job",
  "saved_graph",
  "collection",
  "paper_record",
  "project",
  "audit_event",
  "invitation",
  "membership",
  "api_rate_limit",
  "citation_cache",
  "organization",
  "session",
  "account",
  "verification",
  "user",
] as const;

export async function resetDatabase(): Promise<void> {
  const prisma = getTestPrisma();
  const tableList = TRUNCATE_TABLES.map((name) => `"${name}"`).join(", ");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`,
  );
}

export async function disconnectTestDatabase(): Promise<void> {
  if (testPrisma) {
    await testPrisma.$disconnect();
    testPrisma = undefined;
  }
}
