-- Add tenant-level AI draft approval policy
ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "aiDraftApprovalRequired" BOOLEAN NOT NULL DEFAULT false;
