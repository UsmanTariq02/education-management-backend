CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED');

ALTER TABLE "Organization"
ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
ADD COLUMN "trialDays" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN "trialStartsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "trialEndsAt" TIMESTAMP(3),
ADD COLUMN "subscriptionStartsAt" TIMESTAMP(3),
ADD COLUMN "subscriptionEndsAt" TIMESTAMP(3),
ADD COLUMN "subscriptionNotes" TEXT;

UPDATE "Organization"
SET "trialEndsAt" = "trialStartsAt" + ("trialDays" * INTERVAL '1 day')
WHERE "trialEndsAt" IS NULL;
