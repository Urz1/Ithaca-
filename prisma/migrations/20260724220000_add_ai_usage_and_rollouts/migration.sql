ALTER TABLE "organization" ADD COLUMN "maxAiRequests" INTEGER NOT NULL DEFAULT 10000;
ALTER TABLE "organization" ADD COLUMN "rolloutFlags" JSONB;

CREATE TABLE "ai_usage_record" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputUnits" INTEGER NOT NULL DEFAULT 0,
    "outputUnits" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_record_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_usage_record_organizationId_createdAt_idx" ON "ai_usage_record"("organizationId", "createdAt");
CREATE INDEX "ai_usage_record_userId_createdAt_idx" ON "ai_usage_record"("userId", "createdAt");

ALTER TABLE "ai_usage_record" ADD CONSTRAINT "ai_usage_record_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_usage_record" ADD CONSTRAINT "ai_usage_record_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
