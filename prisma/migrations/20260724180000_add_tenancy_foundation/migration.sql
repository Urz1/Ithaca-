-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateTable
CREATE TABLE "organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "personalOwnerId" TEXT,
    "maxMembers" INTEGER NOT NULL DEFAULT 5,
    "maxProjects" INTEGER NOT NULL DEFAULT 25,
    "maxCollections" INTEGER NOT NULL DEFAULT 100,
    "maxSavedGraphs" INTEGER NOT NULL DEFAULT 100,
    "maxApiRequests" INTEGER NOT NULL DEFAULT 1000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "membership" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "membership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_event" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_event_pkey" PRIMARY KEY ("id")
);

-- Add nullable tenant columns so existing rows can be backfilled first.
ALTER TABLE "project" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "collection" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "saved_graph" ADD COLUMN "organizationId" TEXT;
ALTER TABLE "api_rate_limit" ADD COLUMN "organizationId" TEXT;

-- Create one deterministic personal organization and owner membership per user.
INSERT INTO "organization" (
    "id",
    "name",
    "slug",
    "personalOwnerId",
    "createdAt",
    "updatedAt"
)
SELECT
    'org_' || md5(u."id"),
    COALESCE(NULLIF(u."name", ''), split_part(u."email", '@', 1), 'Personal') || '''s Organization',
    'personal-' || md5(u."id"),
    u."id",
    u."createdAt",
    CURRENT_TIMESTAMP
FROM "user" u;

INSERT INTO "membership" (
    "id",
    "organizationId",
    "userId",
    "role",
    "createdAt",
    "updatedAt"
)
SELECT
    'mem_' || md5(u."id"),
    'org_' || md5(u."id"),
    u."id",
    'OWNER'::"OrganizationRole",
    u."createdAt",
    CURRENT_TIMESTAMP
FROM "user" u;

UPDATE "project" p
SET "organizationId" = 'org_' || md5(p."userId");

UPDATE "collection" c
SET "organizationId" = 'org_' || md5(c."userId");

UPDATE "saved_graph" g
SET "organizationId" = 'org_' || md5(g."userId");

-- ApiRateLimit historically had no user foreign key. Remove only orphaned
-- counters, which cannot be assigned to a valid organization.
DELETE FROM "api_rate_limit" r
WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u."id" = r."userId");

UPDATE "api_rate_limit" r
SET "organizationId" = 'org_' || md5(r."userId");

-- Tenant ownership is now complete for every valid pre-existing row.
ALTER TABLE "project" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "collection" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "saved_graph" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "api_rate_limit" ALTER COLUMN "organizationId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "organization_slug_key" ON "organization"("slug");
CREATE UNIQUE INDEX "organization_personalOwnerId_key" ON "organization"("personalOwnerId");
CREATE UNIQUE INDEX "membership_organizationId_userId_key" ON "membership"("organizationId", "userId");
CREATE INDEX "membership_userId_idx" ON "membership"("userId");
CREATE UNIQUE INDEX "invitation_token_key" ON "invitation"("token");
CREATE UNIQUE INDEX "invitation_organizationId_email_key" ON "invitation"("organizationId", "email");
CREATE INDEX "invitation_email_idx" ON "invitation"("email");
CREATE INDEX "invitation_invitedById_idx" ON "invitation"("invitedById");
CREATE INDEX "audit_event_organizationId_createdAt_idx" ON "audit_event"("organizationId", "createdAt");
CREATE INDEX "audit_event_actorId_idx" ON "audit_event"("actorId");
CREATE INDEX "project_organizationId_idx" ON "project"("organizationId");
CREATE INDEX "collection_organizationId_idx" ON "collection"("organizationId");
CREATE INDEX "saved_graph_organizationId_idx" ON "saved_graph"("organizationId");
CREATE UNIQUE INDEX "api_rate_limit_organizationId_userId_endpoint_key" ON "api_rate_limit"("organizationId", "userId", "endpoint");
CREATE INDEX "api_rate_limit_organizationId_idx" ON "api_rate_limit"("organizationId");

-- AddForeignKey
ALTER TABLE "organization" ADD CONSTRAINT "organization_personalOwnerId_fkey" FOREIGN KEY ("personalOwnerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "membership" ADD CONSTRAINT "membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "membership" ADD CONSTRAINT "membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "invitation" ADD CONSTRAINT "invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_event" ADD CONSTRAINT "audit_event_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "project" ADD CONSTRAINT "project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "collection" ADD CONSTRAINT "collection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "saved_graph" ADD CONSTRAINT "saved_graph_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "api_rate_limit" ADD CONSTRAINT "api_rate_limit_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preserve the existing rate-limit helper signature. New counters are assigned
-- to the user's personal organization unless a tenant is explicitly supplied.
CREATE FUNCTION set_api_rate_limit_organization() RETURNS trigger AS $$
BEGIN
    IF NEW."organizationId" IS NULL THEN
        SELECT o."id" INTO NEW."organizationId"
        FROM "organization" o
        WHERE o."personalOwnerId" = NEW."userId";
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "api_rate_limit_set_organization"
BEFORE INSERT ON "api_rate_limit"
FOR EACH ROW EXECUTE FUNCTION set_api_rate_limit_organization();
