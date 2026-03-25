CREATE TYPE "TimetableDayOfWeek" AS ENUM (
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY'
);

CREATE TABLE "BatchSubjectAssignment" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "academicSessionId" UUID,
  "batchId" UUID NOT NULL,
  "subjectId" UUID NOT NULL,
  "teacherId" UUID,
  "weeklyClasses" INTEGER NOT NULL DEFAULT 1,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BatchSubjectAssignment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TimetableEntry" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "academicSessionId" UUID,
  "batchId" UUID NOT NULL,
  "subjectId" UUID NOT NULL,
  "teacherId" UUID,
  "dayOfWeek" "TimetableDayOfWeek" NOT NULL,
  "startTime" VARCHAR(5) NOT NULL,
  "endTime" VARCHAR(5) NOT NULL,
  "room" VARCHAR(80),
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TimetableEntry_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BatchSubjectAssignment_batchId_subjectId_academicSessionId_key"
ON "BatchSubjectAssignment"("batchId", "subjectId", "academicSessionId");

CREATE INDEX "BatchSubjectAssignment_organizationId_isActive_idx"
ON "BatchSubjectAssignment"("organizationId", "isActive");

CREATE INDEX "BatchSubjectAssignment_batchId_isActive_idx"
ON "BatchSubjectAssignment"("batchId", "isActive");

CREATE INDEX "BatchSubjectAssignment_teacherId_isActive_idx"
ON "BatchSubjectAssignment"("teacherId", "isActive");

CREATE INDEX "TimetableEntry_organizationId_dayOfWeek_isActive_idx"
ON "TimetableEntry"("organizationId", "dayOfWeek", "isActive");

CREATE INDEX "TimetableEntry_batchId_dayOfWeek_startTime_idx"
ON "TimetableEntry"("batchId", "dayOfWeek", "startTime");

CREATE INDEX "TimetableEntry_teacherId_dayOfWeek_startTime_idx"
ON "TimetableEntry"("teacherId", "dayOfWeek", "startTime");

ALTER TABLE "BatchSubjectAssignment"
ADD CONSTRAINT "BatchSubjectAssignment_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BatchSubjectAssignment"
ADD CONSTRAINT "BatchSubjectAssignment_academicSessionId_fkey"
FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "BatchSubjectAssignment"
ADD CONSTRAINT "BatchSubjectAssignment_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BatchSubjectAssignment"
ADD CONSTRAINT "BatchSubjectAssignment_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BatchSubjectAssignment"
ADD CONSTRAINT "BatchSubjectAssignment_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TimetableEntry"
ADD CONSTRAINT "TimetableEntry_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimetableEntry"
ADD CONSTRAINT "TimetableEntry_academicSessionId_fkey"
FOREIGN KEY ("academicSessionId") REFERENCES "AcademicSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TimetableEntry"
ADD CONSTRAINT "TimetableEntry_batchId_fkey"
FOREIGN KEY ("batchId") REFERENCES "Batch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimetableEntry"
ADD CONSTRAINT "TimetableEntry_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimetableEntry"
ADD CONSTRAINT "TimetableEntry_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
