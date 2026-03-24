import { ReminderChannel } from '@prisma/client';

export interface ReminderRecipient {
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  studentPhone: string;
  guardianName: string;
  guardianEmail: string | null;
  guardianPhone: string;
}

export interface ReminderDeliveryPayload {
  channel: ReminderChannel;
  message: string;
  recipient: ReminderRecipient;
}

export interface ReminderDeliveryResult {
  delivered: boolean;
  sentAt?: Date;
  externalReference?: string;
  failureReason?: string;
}

export interface ReminderDeliveryProvider {
  send(payload: ReminderDeliveryPayload): Promise<ReminderDeliveryResult>;
}
