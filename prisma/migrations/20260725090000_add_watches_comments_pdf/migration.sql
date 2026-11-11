-- AlterTable
ALTER TABLE "collection" ADD COLUMN "watchEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "collection" ADD COLUMN "lastDigestAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "paper_record" ADD COLUMN "pdfUrl" TEXT;
ALTER TABLE "paper_record" ADD COLUMN "pdfArtifactId" TEXT;

-- CreateIndex
CREATE INDEX "collection_watchEnabled_idx" ON "collection"("watchEnabled");

-- CreateTable
CREATE TABLE "edge_comment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "citingId" TEXT NOT NULL,
    "citedId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "edgeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "edge_comment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "edge_comment_organizationId_citingId_citedId_idx" ON "edge_comment"("organizationId", "citingId", "citedId");

-- CreateIndex
CREATE INDEX "edge_comment_actorId_idx" ON "edge_comment"("actorId");

-- AddForeignKey
ALTER TABLE "edge_comment" ADD CONSTRAINT "edge_comment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "edge_comment" ADD CONSTRAINT "edge_comment_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
