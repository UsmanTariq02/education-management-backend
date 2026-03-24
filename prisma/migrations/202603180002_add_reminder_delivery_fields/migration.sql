ALTER TABLE "ReminderLog"
ADD COLUMN "deliveryReference" VARCHAR(255),
ADD COLUMN "failureReason" TEXT;
