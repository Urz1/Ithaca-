-- Add collaborative paper records for org-scoped imports

ALTER TABLE "organization" ADD COLUMN "maxPaperRecords" INTEGER NOT NULL DEFAULT 10000;

CREATE TABLE "paper_record" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "doi" TEXT,
    "openAlexId" TEXT,
    "title" TEXT,
    "authors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "year" INTEGER,
    "venue" TEXT,
    "abstract" TEXT,
    "provenance" JSONB,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paper_record_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "paper_record_organizationId_dedupeKey_key" ON "paper_record"("organizationId", "dedupeKey");
CREATE INDEX "paper_record_organizationId_idx" ON "paper_record"("organizationId");
CREATE INDEX "paper_record_userId_idx" ON "paper_record"("userId");
CREATE INDEX "paper_record_doi_idx" ON "paper_record"("doi");
CREATE INDEX "paper_record_openAlexId_idx" ON "paper_record"("openAlexId");

ALTER TABLE "paper_record" ADD CONSTRAINT "paper_record_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "paper_record" ADD CONSTRAINT "paper_record_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
