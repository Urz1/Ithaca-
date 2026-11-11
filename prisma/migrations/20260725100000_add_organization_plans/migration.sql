-- CreateEnum
CREATE TYPE "OrganizationPlan" AS ENUM ('SOLO', 'LAB', 'INSTITUTION');

-- AlterTable
ALTER TABLE "organization" ADD COLUMN "plan" "OrganizationPlan" NOT NULL DEFAULT 'SOLO';
ALTER TABLE "organization" ADD COLUMN "allowedEmailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "organization" ADD COLUMN "supportContactEmail" TEXT;

-- Align default solo quotas for new rows (existing rows keep current values)
ALTER TABLE "organization" ALTER COLUMN "maxMembers" SET DEFAULT 3;
ALTER TABLE "organization" ALTER COLUMN "maxProjects" SET DEFAULT 10;
ALTER TABLE "organization" ALTER COLUMN "maxCollections" SET DEFAULT 25;
ALTER TABLE "organization" ALTER COLUMN "maxSavedGraphs" SET DEFAULT 25;
ALTER TABLE "organization" ALTER COLUMN "maxPaperRecords" SET DEFAULT 5000;
ALTER TABLE "organization" ALTER COLUMN "maxAiRequests" SET DEFAULT 2000;
