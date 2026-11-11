-- Background jobs and durable artifact storage

CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "background_job" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "idempotencyKey" TEXT NOT NULL,
    "payload" JSONB,
    "result" JSONB,
    "errorMessage" TEXT,
    "artifactId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "background_job_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "stored_artifact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "pathname" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sizeBytes" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stored_artifact_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "background_job_idempotencyKey_key" ON "background_job"("idempotencyKey");
CREATE UNIQUE INDEX "background_job_artifactId_key" ON "background_job"("artifactId");
CREATE INDEX "background_job_organizationId_createdAt_idx" ON "background_job"("organizationId", "createdAt");
CREATE INDEX "background_job_userId_createdAt_idx" ON "background_job"("userId", "createdAt");
CREATE INDEX "background_job_status_idx" ON "background_job"("status");
CREATE INDEX "stored_artifact_organizationId_createdAt_idx" ON "stored_artifact"("organizationId", "createdAt");

ALTER TABLE "background_job" ADD CONSTRAINT "background_job_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "background_job" ADD CONSTRAINT "background_job_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "background_job" ADD CONSTRAINT "background_job_artifactId_fkey" FOREIGN KEY ("artifactId") REFERENCES "stored_artifact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stored_artifact" ADD CONSTRAINT "stored_artifact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
