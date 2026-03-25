CREATE TYPE "StudentDocumentType" AS ENUM (
    'ID_CARD',
    'ADMISSION_FORM',
    'BIRTH_CERTIFICATE',
    'GUARDIAN_ID',
    'ACADEMIC_RECORD',
    'MEDICAL_RECORD',
    'OTHER'
);

CREATE TYPE "OrganizationAssetType" AS ENUM (
    'LOGO',
    'LETTERHEAD',
    'STAMP',
    'BROCHURE',
    'OTHER'
);

CREATE TABLE "StudentDocument" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "uploadedByUserId" UUID,
    "title" VARCHAR(150) NOT NULL,
    "type" "StudentDocumentType" NOT NULL,
    "notes" TEXT,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(120) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationAsset" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "uploadedByUserId" UUID,
    "title" VARCHAR(150) NOT NULL,
    "type" "OrganizationAssetType" NOT NULL,
    "notes" TEXT,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(120) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storagePath" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentDocument_organizationId_studentId_type_idx" ON "StudentDocument"("organizationId", "studentId", "type");
CREATE INDEX "StudentDocument_uploadedByUserId_idx" ON "StudentDocument"("uploadedByUserId");
CREATE INDEX "OrganizationAsset_organizationId_type_idx" ON "OrganizationAsset"("organizationId", "type");
CREATE INDEX "OrganizationAsset_uploadedByUserId_idx" ON "OrganizationAsset"("uploadedByUserId");

ALTER TABLE "StudentDocument"
ADD CONSTRAINT "StudentDocument_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentDocument"
ADD CONSTRAINT "StudentDocument_studentId_fkey"
FOREIGN KEY ("studentId") REFERENCES "Student"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentDocument"
ADD CONSTRAINT "StudentDocument_uploadedByUserId_fkey"
FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrganizationAsset"
ADD CONSTRAINT "OrganizationAsset_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "OrganizationAsset"
ADD CONSTRAINT "OrganizationAsset_uploadedByUserId_fkey"
FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
