ALTER TABLE "public"."OnlineClassSession"
ADD COLUMN "syncFailureAlertSentAt" TIMESTAMP(3),
ADD COLUMN "pendingAttendanceAlertSentAt" TIMESTAMP(3);
