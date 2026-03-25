CREATE TYPE "UserLoginEventStatus" AS ENUM (
  'SUCCESS',
  'FAILED',
  'BLOCKED',
  'LOGOUT',
  'REFRESH',
  'SESSION_REVOKED'
);

ALTER TABLE "RefreshToken"
ADD COLUMN "userAgent" VARCHAR(255),
ADD COLUMN "ipAddress" VARCHAR(80),
ADD COLUMN "lastUsedAt" TIMESTAMP(3),
ADD COLUMN "revocationReason" VARCHAR(120);

CREATE TABLE "UserLoginEvent" (
  "id" UUID NOT NULL,
  "userId" UUID,
  "organizationId" UUID,
  "email" VARCHAR(255) NOT NULL,
  "status" "UserLoginEventStatus" NOT NULL,
  "ipAddress" VARCHAR(80),
  "userAgent" VARCHAR(255),
  "failureReason" VARCHAR(120),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "UserLoginEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "UserLoginEvent"
ADD CONSTRAINT "UserLoginEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserLoginEvent"
ADD CONSTRAINT "UserLoginEvent_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "RefreshToken_userId_revokedAt_createdAt_idx" ON "RefreshToken"("userId", "revokedAt", "createdAt");
CREATE INDEX "UserLoginEvent_email_createdAt_idx" ON "UserLoginEvent"("email", "createdAt");
CREATE INDEX "UserLoginEvent_userId_createdAt_idx" ON "UserLoginEvent"("userId", "createdAt");
CREATE INDEX "UserLoginEvent_organizationId_createdAt_idx" ON "UserLoginEvent"("organizationId", "createdAt");
CREATE INDEX "UserLoginEvent_status_createdAt_idx" ON "UserLoginEvent"("status", "createdAt");
