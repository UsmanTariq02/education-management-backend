CREATE TYPE "BillingEntryType" AS ENUM ('SUBSCRIPTION', 'TRIAL_EXTENSION', 'ADJUSTMENT', 'MANUAL_INVOICE');
CREATE TYPE "BillingEntryStatus" AS ENUM ('OPEN', 'PAID', 'VOID');

CREATE TABLE "OrganizationBillingEntry" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "type" "BillingEntryType" NOT NULL,
  "status" "BillingEntryStatus" NOT NULL DEFAULT 'OPEN',
  "title" VARCHAR(180) NOT NULL,
  "description" TEXT,
  "amount" INTEGER NOT NULL,
  "currency" VARCHAR(10) NOT NULL DEFAULT 'USD',
  "dueDate" TIMESTAMP(3),
  "entryDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "periodStart" TIMESTAMP(3),
  "periodEnd" TIMESTAMP(3),
  "userCountSnapshot" INTEGER,
  "moduleCountSnapshot" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrganizationBillingEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OrganizationBillingEntry_organizationId_entryDate_idx" ON "OrganizationBillingEntry"("organizationId", "entryDate");
CREATE INDEX "OrganizationBillingEntry_organizationId_status_idx" ON "OrganizationBillingEntry"("organizationId", "status");

ALTER TABLE "OrganizationBillingEntry"
ADD CONSTRAINT "OrganizationBillingEntry_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
