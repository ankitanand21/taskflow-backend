ALTER TABLE "JobRecord" ADD COLUMN "organizationId" TEXT;

CREATE INDEX "JobRecord_organizationId_createdAt_idx" ON "JobRecord"("organizationId", "createdAt");
