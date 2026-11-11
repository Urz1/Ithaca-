-- AlterTable
ALTER TABLE "citation_cache" ADD COLUMN     "classifierVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "contexts" TEXT,
ADD COLUMN     "s2Intents" TEXT;
