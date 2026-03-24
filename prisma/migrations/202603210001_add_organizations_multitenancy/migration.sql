CREATE TABLE "Organization" (
  "id" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "email" VARCHAR(255),
  "phone" VARCHAR(30),
  "address" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

INSERT INTO "Organization" (
  "id",
  "name",
  "slug",
  "email",
  "phone",
  "address",
  "isActive",
  "createdAt",
  "updatedAt"
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Default Academy',
  'default-academy',
  'admin@default-academy.edu.local',
  NULL,
  NULL,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO NOTHING;

ALTER TABLE "User" ADD COLUMN "organizationId" UUID;
ALTER TABLE "Student" ADD COLUMN "organizationId" UUID;
ALTER TABLE "Batch" ADD COLUMN "organizationId" UUID;
ALTER TABLE "FeePlan" ADD COLUMN "organizationId" UUID;
ALTER TABLE "FeeRecord" ADD COLUMN "organizationId" UUID;
ALTER TABLE "Attendance" ADD COLUMN "organizationId" UUID;
ALTER TABLE "ReminderLog" ADD COLUMN "organizationId" UUID;
ALTER TABLE "AuditLog" ADD COLUMN "organizationId" UUID;

UPDATE "Student"
SET "organizationId" = '11111111-1111-1111-1111-111111111111'
WHERE "organizationId" IS NULL;

UPDATE "Batch"
SET "organizationId" = '11111111-1111-1111-1111-111111111111'
WHERE "organizationId" IS NULL;

UPDATE "FeePlan"
SET "organizationId" = '11111111-1111-1111-1111-111111111111'
WHERE "organizationId" IS NULL;

UPDATE "FeeRecord"
SET "organizationId" = '11111111-1111-1111-1111-111111111111'
WHERE "organizationId" IS NULL;

UPDATE "Attendance"
SET "organizationId" = '11111111-1111-1111-1111-111111111111'
WHERE "organizationId" IS NULL;

UPDATE "ReminderLog"
SET "organizationId" = '11111111-1111-1111-1111-111111111111'
WHERE "organizationId" IS NULL;

UPDATE "AuditLog"
SET "organizationId" = '11111111-1111-1111-1111-111111111111'
WHERE "organizationId" IS NULL;

UPDATE "User"
SET "organizationId" = '11111111-1111-1111-1111-111111111111'
WHERE "organizationId" IS NULL
  AND "id" IN (
    SELECT ur."userId"
    FROM "UserRole" ur
    INNER JOIN "Role" r ON r."id" = ur."roleId"
    WHERE r."name" <> 'SUPER_ADMIN'
  );

ALTER TABLE "Student" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Batch" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "FeePlan" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "FeeRecord" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "Attendance" ALTER COLUMN "organizationId" SET NOT NULL;
ALTER TABLE "ReminderLog" ALTER COLUMN "organizationId" SET NOT NULL;

DROP INDEX "Student_email_key";
DROP INDEX "Batch_code_key";

CREATE INDEX "User_organizationId_isActive_idx" ON "User"("organizationId", "isActive");
CREATE INDEX "Student_organizationId_status_idx" ON "Student"("organizationId", "status");
CREATE UNIQUE INDEX "Student_organizationId_email_key" ON "Student"("organizationId", "email");
CREATE UNIQUE INDEX "Student_organizationId_phone_key" ON "Student"("organizationId", "phone");
CREATE INDEX "Batch_organizationId_isActive_idx" ON "Batch"("organizationId", "isActive");
CREATE UNIQUE INDEX "Batch_organizationId_code_key" ON "Batch"("organizationId", "code");
CREATE INDEX "FeePlan_organizationId_isActive_idx" ON "FeePlan"("organizationId", "isActive");
CREATE INDEX "FeeRecord_organizationId_status_idx" ON "FeeRecord"("organizationId", "status");
CREATE INDEX "Attendance_organizationId_attendanceDate_idx" ON "Attendance"("organizationId", "attendanceDate");
CREATE INDEX "ReminderLog_organizationId_status_idx" ON "ReminderLog"("organizationId", "status");
CREATE INDEX "AuditLog_organizationId_createdAt_idx" ON "AuditLog"("organizationId", "createdAt");

ALTER TABLE "User"
ADD CONSTRAINT "User_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Student"
ADD CONSTRAINT "Student_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Batch"
ADD CONSTRAINT "Batch_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeePlan"
ADD CONSTRAINT "FeePlan_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeeRecord"
ADD CONSTRAINT "FeeRecord_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attendance"
ADD CONSTRAINT "Attendance_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReminderLog"
ADD CONSTRAINT "ReminderLog_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
