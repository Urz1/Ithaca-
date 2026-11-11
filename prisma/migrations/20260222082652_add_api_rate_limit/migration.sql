-- CreateTable
CREATE TABLE "api_rate_limit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 1,
    "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_rate_limit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "api_rate_limit_windowStart_idx" ON "api_rate_limit"("windowStart");

-- CreateIndex
CREATE UNIQUE INDEX "api_rate_limit_userId_endpoint_key" ON "api_rate_limit"("userId", "endpoint");
