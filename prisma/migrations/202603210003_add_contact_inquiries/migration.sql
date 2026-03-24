CREATE TYPE "ContactInquiryStatus" AS ENUM ('NEW', 'REVIEWED', 'CONTACTED');

CREATE TABLE "ContactInquiry" (
  "id" UUID NOT NULL,
  "fullName" VARCHAR(150) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "institutionName" VARCHAR(180) NOT NULL,
  "phone" VARCHAR(30),
  "institutionType" VARCHAR(80),
  "expectedUserCount" VARCHAR(40),
  "requestedModules" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "inquiryType" VARCHAR(100),
  "message" TEXT NOT NULL,
  "status" "ContactInquiryStatus" NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactInquiry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ContactInquiry_email_createdAt_idx" ON "ContactInquiry"("email", "createdAt");
CREATE INDEX "ContactInquiry_status_createdAt_idx" ON "ContactInquiry"("status", "createdAt");
CREATE INDEX "ContactInquiry_institutionType_idx" ON "ContactInquiry"("institutionType");
