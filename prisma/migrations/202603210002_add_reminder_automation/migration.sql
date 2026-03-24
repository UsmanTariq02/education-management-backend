CREATE TYPE "ReminderAutomationTrigger" AS ENUM ('FEE_DUE', 'FEE_OVERDUE', 'PAYMENT_RECEIVED');
CREATE TYPE "ReminderRecipientTarget" AS ENUM ('STUDENT', 'GUARDIAN', 'BOTH');
CREATE TYPE "ReminderScheduleStatus" AS ENUM ('PENDING', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED', 'SKIPPED');

CREATE TABLE "ReminderTemplate" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "channel" "ReminderChannel" NOT NULL,
  "target" "ReminderRecipientTarget" NOT NULL DEFAULT 'GUARDIAN',
  "subject" VARCHAR(255),
  "body" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReminderTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReminderRule" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "templateId" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "trigger" "ReminderAutomationTrigger" NOT NULL,
  "offsetDays" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReminderRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReminderSchedule" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "ruleId" UUID NOT NULL,
  "templateId" UUID NOT NULL,
  "studentId" UUID NOT NULL,
  "feeRecordId" UUID,
  "reminderLogId" UUID,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "processedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "status" "ReminderScheduleStatus" NOT NULL DEFAULT 'PENDING',
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReminderSchedule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReminderProviderSetting" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "autoRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT false,
  "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
  "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "paymentConfirmationEnabled" BOOLEAN NOT NULL DEFAULT false,
  "senderName" VARCHAR(150),
  "replyToEmail" VARCHAR(255),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReminderProviderSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReminderTemplate_organizationId_code_channel_key" ON "ReminderTemplate"("organizationId", "code", "channel");
CREATE INDEX "ReminderTemplate_organizationId_isActive_idx" ON "ReminderTemplate"("organizationId", "isActive");
CREATE INDEX "ReminderRule_organizationId_trigger_isActive_idx" ON "ReminderRule"("organizationId", "trigger", "isActive");
CREATE UNIQUE INDEX "ReminderSchedule_reminderLogId_key" ON "ReminderSchedule"("reminderLogId");
CREATE UNIQUE INDEX "ReminderSchedule_organizationId_ruleId_studentId_feeRecordId_key" ON "ReminderSchedule"("organizationId", "ruleId", "studentId", "feeRecordId");
CREATE INDEX "ReminderSchedule_organizationId_status_scheduledFor_idx" ON "ReminderSchedule"("organizationId", "status", "scheduledFor");
CREATE UNIQUE INDEX "ReminderProviderSetting_organizationId_key" ON "ReminderProviderSetting"("organizationId");

ALTER TABLE "ReminderTemplate" ADD CONSTRAINT "ReminderTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderRule" ADD CONSTRAINT "ReminderRule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderRule" ADD CONSTRAINT "ReminderRule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReminderTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderSchedule" ADD CONSTRAINT "ReminderSchedule_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderSchedule" ADD CONSTRAINT "ReminderSchedule_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "ReminderRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderSchedule" ADD CONSTRAINT "ReminderSchedule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ReminderTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderSchedule" ADD CONSTRAINT "ReminderSchedule_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ReminderSchedule" ADD CONSTRAINT "ReminderSchedule_feeRecordId_fkey" FOREIGN KEY ("feeRecordId") REFERENCES "FeeRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReminderSchedule" ADD CONSTRAINT "ReminderSchedule_reminderLogId_fkey" FOREIGN KEY ("reminderLogId") REFERENCES "ReminderLog"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ReminderProviderSetting" ADD CONSTRAINT "ReminderProviderSetting_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
