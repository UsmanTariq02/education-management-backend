CREATE TYPE "public"."SyncJobStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

ALTER TABLE "public"."OnlineClassSession"
ADD COLUMN "lastParticipantSyncAt" TIMESTAMP(3),
ADD COLUMN "lastParticipantSyncStatus" "public"."SyncJobStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "lastParticipantSyncError" TEXT;

CREATE INDEX "OnlineClassSession_lastParticipantSyncStatus_scheduledStartAt_idx"
ON "public"."OnlineClassSession"("lastParticipantSyncStatus", "scheduledStartAt");

CREATE TABLE "public"."OnlineClassAutomationRun" (
  "id" UUID NOT NULL,
  "organizationId" UUID,
  "triggeredByUserId" UUID,
  "status" "public"."SyncJobStatus" NOT NULL DEFAULT 'PENDING',
  "generatedCount" INTEGER NOT NULL DEFAULT 0,
  "syncedCount" INTEGER NOT NULL DEFAULT 0,
  "attendanceProcessedCount" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnlineClassAutomationRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OnlineClassAutomationRun_status_startedAt_idx"
ON "public"."OnlineClassAutomationRun"("status", "startedAt");

CREATE INDEX "OnlineClassAutomationRun_organizationId_startedAt_idx"
ON "public"."OnlineClassAutomationRun"("organizationId", "startedAt");

ALTER TABLE "public"."OnlineClassAutomationRun"
ADD CONSTRAINT "OnlineClassAutomationRun_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."OnlineClassAutomationRun"
ADD CONSTRAINT "OnlineClassAutomationRun_triggeredByUserId_fkey"
FOREIGN KEY ("triggeredByUserId") REFERENCES "public"."User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
