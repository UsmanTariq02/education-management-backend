-- Add tenant-scoped OpenAI key storage
ALTER TABLE "Organization"
ADD COLUMN "openAiApiKeyEncrypted" TEXT,
ADD COLUMN "openAiApiKeyUpdatedAt" TIMESTAMP(3);
