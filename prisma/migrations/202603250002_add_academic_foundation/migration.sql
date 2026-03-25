ALTER TYPE "OrganizationModule" ADD VALUE IF NOT EXISTS 'ACADEMICS';

CREATE TABLE "AcademicSession" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "description" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "isCurrent" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AcademicSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subject" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "name" VARCHAR(120) NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Teacher" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "employeeId" VARCHAR(50) NOT NULL,
  "firstName" VARCHAR(100) NOT NULL,
  "lastName" VARCHAR(100) NOT NULL,
  "fullName" VARCHAR(201) NOT NULL,
  "email" VARCHAR(255),
  "phone" VARCHAR(30) NOT NULL,
  "qualification" VARCHAR(150),
  "specialization" VARCHAR(150),
  "joinedAt" TIMESTAMP(3) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AcademicSession_organizationId_code_key" ON "AcademicSession"("organizationId", "code");
CREATE INDEX "AcademicSession_organizationId_isActive_idx" ON "AcademicSession"("organizationId", "isActive");
CREATE INDEX "AcademicSession_organizationId_isCurrent_idx" ON "AcademicSession"("organizationId", "isCurrent");

CREATE UNIQUE INDEX "Subject_organizationId_code_key" ON "Subject"("organizationId", "code");
CREATE INDEX "Subject_organizationId_isActive_idx" ON "Subject"("organizationId", "isActive");
CREATE INDEX "Subject_organizationId_name_idx" ON "Subject"("organizationId", "name");

CREATE UNIQUE INDEX "Teacher_organizationId_employeeId_key" ON "Teacher"("organizationId", "employeeId");
CREATE UNIQUE INDEX "Teacher_organizationId_email_key" ON "Teacher"("organizationId", "email");
CREATE INDEX "Teacher_organizationId_isActive_idx" ON "Teacher"("organizationId", "isActive");
CREATE INDEX "Teacher_organizationId_fullName_idx" ON "Teacher"("organizationId", "fullName");

ALTER TABLE "AcademicSession"
  ADD CONSTRAINT "AcademicSession_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Subject"
  ADD CONSTRAINT "Subject_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Teacher"
  ADD CONSTRAINT "Teacher_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
