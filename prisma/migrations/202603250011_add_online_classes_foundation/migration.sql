CREATE TYPE "ClassDeliveryMode" AS ENUM ('OFFLINE', 'ONLINE', 'HYBRID');
CREATE TYPE "OnlineClassProvider" AS ENUM ('GOOGLE_MEET', 'ZOOM');
CREATE TYPE "OnlineClassSessionStatus" AS ENUM ('SCHEDULED', 'LIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "AttendanceSource" AS ENUM ('MANUAL', 'ONLINE_CLASS');

ALTER TABLE "TimetableEntry"
ADD COLUMN "deliveryMode" "ClassDeliveryMode" NOT NULL DEFAULT 'OFFLINE',
ADD COLUMN "onlineClassProvider" "OnlineClassProvider",
ADD COLUMN "onlineMeetingUrl" VARCHAR(500),
ADD COLUMN "onlineMeetingCode" VARCHAR(120),
ADD COLUMN "externalCalendarEventId" VARCHAR(255),
ADD COLUMN "autoAttendanceEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "attendanceJoinThresholdMinutes" INTEGER NOT NULL DEFAULT 5;

ALTER TABLE "Attendance"
ADD COLUMN "source" "AttendanceSource" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN "onlineClassSessionId" UUID;

CREATE TABLE "OnlineClassSession" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "timetableEntryId" UUID NOT NULL,
  "academicSessionId" UUID,
  "batchId" UUID NOT NULL,
  "subjectId" UUID NOT NULL,
  "teacherId" UUID,
  "provider" "OnlineClassProvider" NOT NULL,
  "status" "OnlineClassSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
  "scheduledStartAt" TIMESTAMP(3) NOT NULL,
  "scheduledEndAt" TIMESTAMP(3) NOT NULL,
  "actualStartAt" TIMESTAMP(3),
  "actualEndAt" TIMESTAMP(3),
  "meetingUrl" VARCHAR(500),
  "meetingCode" VARCHAR(120),
  "externalCalendarEventId" VARCHAR(255),
  "externalSpaceId" VARCHAR(255),
  "externalConferenceRecordId" VARCHAR(255),
  "attendanceProcessedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnlineClassSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OnlineClassParticipantSession" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "onlineClassSessionId" UUID NOT NULL,
  "studentId" UUID,
  "participantEmail" VARCHAR(255),
  "participantName" VARCHAR(150),
  "externalParticipantId" VARCHAR(255),
  "joinedAt" TIMESTAMP(3) NOT NULL,
  "leftAt" TIMESTAMP(3),
  "totalMinutes" INTEGER NOT NULL DEFAULT 0,
  "attendanceMarked" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OnlineClassParticipantSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_onlineClassSessionId_fkey"
FOREIGN KEY ("onlineClassSessionId") REFERENCES "OnlineClassSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OnlineClassSession"
ADD CONSTRAINT "OnlineClassSession_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnlineClassSession"
ADD CONSTRAINT "OnlineClassSession_timetableEntryId_fkey"
FOREIGN KEY ("timetableEntryId") REFERENCES "TimetableEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnlineClassSession"
ADD CONSTRAINT "OnlineClassSession_academicSessionId_fkey"
FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OnlineClassSession"
ADD CONSTRAINT "OnlineClassSession_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnlineClassSession"
ADD CONSTRAINT "OnlineClassSession_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnlineClassSession"
ADD CONSTRAINT "OnlineClassSession_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OnlineClassParticipantSession"
ADD CONSTRAINT "OnlineClassParticipantSession_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnlineClassParticipantSession"
ADD CONSTRAINT "OnlineClassParticipantSession_onlineClassSessionId_fkey"
FOREIGN KEY ("onlineClassSessionId") REFERENCES "OnlineClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OnlineClassParticipantSession"
ADD CONSTRAINT "OnlineClassParticipantSession_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Attendance_onlineClassSessionId_idx" ON "Attendance"("onlineClassSessionId");
CREATE INDEX "OnlineClassSession_organizationId_status_scheduledStartAt_idx" ON "OnlineClassSession"("organizationId", "status", "scheduledStartAt");
CREATE INDEX "OnlineClassSession_timetableEntryId_scheduledStartAt_idx" ON "OnlineClassSession"("timetableEntryId", "scheduledStartAt");
CREATE INDEX "OnlineClassSession_batchId_scheduledStartAt_idx" ON "OnlineClassSession"("batchId", "scheduledStartAt");
CREATE INDEX "OnlineClassParticipantSession_organizationId_joinedAt_idx" ON "OnlineClassParticipantSession"("organizationId", "joinedAt");
CREATE INDEX "OnlineClassParticipantSession_onlineClassSessionId_joinedAt_idx" ON "OnlineClassParticipantSession"("onlineClassSessionId", "joinedAt");
CREATE INDEX "OnlineClassParticipantSession_studentId_joinedAt_idx" ON "OnlineClassParticipantSession"("studentId", "joinedAt");
CREATE INDEX "OnlineClassParticipantSession_participantEmail_idx" ON "OnlineClassParticipantSession"("participantEmail");
