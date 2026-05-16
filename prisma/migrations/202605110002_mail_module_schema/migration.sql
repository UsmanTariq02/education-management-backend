-- Mail mailbox enums and schema.
CREATE TYPE "MailMessageStatus" AS ENUM ('DRAFT', 'SENT');
CREATE TYPE "MailRecipientType" AS ENUM ('TO', 'CC', 'BCC');

ALTER TABLE "Organization"
  ALTER COLUMN "enabledModules"
  SET DEFAULT ARRAY['USERS','STUDENTS','PORTALS','BATCHES','ACADEMICS','FEES','ATTENDANCE','REMINDERS','MAIL','REPORTS','ACTIVITY_LOGS','SETTINGS','MEDIA']::"OrganizationModule"[];

UPDATE "Organization"
SET "enabledModules" = array_append("enabledModules", 'MAIL'::"OrganizationModule")
WHERE NOT ("enabledModules" @> ARRAY['MAIL'::"OrganizationModule"]);

CREATE TABLE "MailConversation" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "subject" VARCHAR(255) NOT NULL,
  "createdByEmail" VARCHAR(255) NOT NULL,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MailConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MailMessage" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "conversationId" UUID NOT NULL,
  "senderEmail" VARCHAR(255) NOT NULL,
  "senderName" VARCHAR(201) NOT NULL,
  "subject" VARCHAR(255) NOT NULL,
  "body" TEXT NOT NULL,
  "status" "MailMessageStatus" NOT NULL DEFAULT 'DRAFT',
  "sentAt" TIMESTAMP(3),
  "senderReadAt" TIMESTAMP(3),
  "senderStarredAt" TIMESTAMP(3),
  "senderArchivedAt" TIMESTAMP(3),
  "senderTrashedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MailMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MailRecipient" (
  "id" UUID NOT NULL,
  "mailMessageId" UUID NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "name" VARCHAR(201),
  "recipientType" "MailRecipientType" NOT NULL DEFAULT 'TO',
  "readAt" TIMESTAMP(3),
  "starredAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "trashedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MailRecipient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MailConversation_organizationId_lastMessageAt_idx" ON "MailConversation"("organizationId", "lastMessageAt");
CREATE INDEX "MailConversation_organizationId_createdAt_idx" ON "MailConversation"("organizationId", "createdAt");
CREATE INDEX "MailMessage_organizationId_senderEmail_status_createdAt_idx" ON "MailMessage"("organizationId", "senderEmail", "status", "createdAt");
CREATE INDEX "MailMessage_organizationId_conversationId_createdAt_idx" ON "MailMessage"("organizationId", "conversationId", "createdAt");
CREATE INDEX "MailMessage_status_sentAt_idx" ON "MailMessage"("status", "sentAt");
CREATE INDEX "MailRecipient_email_createdAt_idx" ON "MailRecipient"("email", "createdAt");
CREATE INDEX "MailRecipient_mailMessageId_email_idx" ON "MailRecipient"("mailMessageId", "email");
CREATE INDEX "MailRecipient_email_readAt_idx" ON "MailRecipient"("email", "readAt");

ALTER TABLE "MailConversation"
  ADD CONSTRAINT "MailConversation_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MailMessage"
  ADD CONSTRAINT "MailMessage_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MailMessage"
  ADD CONSTRAINT "MailMessage_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "MailConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MailRecipient"
  ADD CONSTRAINT "MailRecipient_mailMessageId_fkey"
  FOREIGN KEY ("mailMessageId") REFERENCES "MailMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
