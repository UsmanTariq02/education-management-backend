-- Create persisted AI review queue storage
CREATE TABLE "AiReviewQueueItem" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "kind" VARCHAR(50) NOT NULL,
  "title" VARCHAR(180) NOT NULL,
  "summary" VARCHAR(500) NOT NULL,
  "body" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),

  CONSTRAINT "AiReviewQueueItem_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiReviewQueueItem_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiReviewQueueItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AiReviewQueueItem_organizationId_userId_status_idx" ON "AiReviewQueueItem"("organizationId", "userId", "status");
CREATE INDEX "AiReviewQueueItem_organizationId_kind_idx" ON "AiReviewQueueItem"("organizationId", "kind");
