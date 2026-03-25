CREATE TABLE "public"."OnlineClassProviderSetting" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "provider" "public"."OnlineClassProvider" NOT NULL DEFAULT 'GOOGLE_MEET',
  "integrationEnabled" BOOLEAN NOT NULL DEFAULT false,
  "autoCreateMeetLinks" BOOLEAN NOT NULL DEFAULT false,
  "autoSyncParticipants" BOOLEAN NOT NULL DEFAULT false,
  "calendarId" VARCHAR(255),
  "impersonatedUserEmail" VARCHAR(255),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OnlineClassProviderSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OnlineClassProviderSetting_organizationId_key"
ON "public"."OnlineClassProviderSetting"("organizationId");

ALTER TABLE "public"."OnlineClassProviderSetting"
ADD CONSTRAINT "OnlineClassProviderSetting_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
