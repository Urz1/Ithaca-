-- CreateTable
CREATE TABLE "citation_cache" (
    "id" TEXT NOT NULL,
    "citingId" TEXT NOT NULL,
    "citedId" TEXT NOT NULL,
    "edgeType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "snippet" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "citation_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "citation_cache_citingId_idx" ON "citation_cache"("citingId");

-- CreateIndex
CREATE INDEX "citation_cache_citedId_idx" ON "citation_cache"("citedId");

-- CreateIndex
CREATE UNIQUE INDEX "citation_cache_citingId_citedId_key" ON "citation_cache"("citingId", "citedId");
