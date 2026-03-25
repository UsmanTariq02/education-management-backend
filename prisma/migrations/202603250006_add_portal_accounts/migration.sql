CREATE TYPE "PortalAccountType" AS ENUM ('STUDENT', 'PARENT');

CREATE TABLE "PortalAccount" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "type" "PortalAccountType" NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "refreshTokenHash" VARCHAR(255),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortalAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PortalAccount_studentId_type_key" ON "PortalAccount"("studentId", "type");
CREATE UNIQUE INDEX "PortalAccount_organizationId_email_type_key" ON "PortalAccount"("organizationId", "email", "type");
CREATE INDEX "PortalAccount_organizationId_type_isActive_idx" ON "PortalAccount"("organizationId", "type", "isActive");
CREATE INDEX "PortalAccount_studentId_type_idx" ON "PortalAccount"("studentId", "type");

ALTER TABLE "PortalAccount"
ADD CONSTRAINT "PortalAccount_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PortalAccount"
ADD CONSTRAINT "PortalAccount_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
