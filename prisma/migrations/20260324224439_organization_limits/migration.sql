-- AlterTable
ALTER TABLE "ContactInquiry" ALTER COLUMN "requestedModules" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- RenameIndex
ALTER INDEX "ReminderSchedule_organizationId_ruleId_studentId_feeRecordId_ke" RENAME TO "ReminderSchedule_organizationId_ruleId_studentId_feeRecordI_key";
