import { Inject, Injectable } from '@nestjs/common';
import { ReminderChannel, ReminderStatus } from '@prisma/client';
import {
  EMAIL_REMINDER_PROVIDER,
  WHATSAPP_REMINDER_PROVIDER,
} from '../../common/constants/injection-tokens';
import { FileLogService } from '../../common/services/file-log.service';
import {
  ReminderDeliveryPayload,
  ReminderDeliveryProvider,
  ReminderDeliveryResult,
} from './interfaces/reminder-delivery-provider.interface';

@Injectable()
export class ReminderDeliveryService {
  constructor(
    @Inject(EMAIL_REMINDER_PROVIDER)
    private readonly emailProvider: ReminderDeliveryProvider,
    @Inject(WHATSAPP_REMINDER_PROVIDER)
    private readonly whatsappProvider: ReminderDeliveryProvider,
    private readonly fileLogService: FileLogService,
  ) {}

  async deliver(payload: ReminderDeliveryPayload): Promise<ReminderDeliveryResult> {
    try {
      if (payload.channel === ReminderChannel.EMAIL) {
        const result = await this.emailProvider.send(payload);
        await this.logFailureIfNeeded(payload, result);
        return result;
      }

      if (payload.channel === ReminderChannel.WHATSAPP) {
        const result = await this.whatsappProvider.send(payload);
        await this.logFailureIfNeeded(payload, result);
        return result;
      }

      if (payload.channel === ReminderChannel.MANUAL) {
        return {
          delivered: true,
          sentAt: new Date(),
          externalReference: 'manual-entry',
        };
      }

      const result = {
        delivered: false,
        failureReason: `Provider integration is not configured for ${payload.channel}`,
      };
      await this.logFailureIfNeeded(payload, result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown delivery error';
      const result = {
        delivered: false,
        failureReason: message,
      };
      await this.fileLogService.logError({
        message: `Reminder delivery exception for ${payload.channel} to student=${payload.recipient.studentId}: ${message}`,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return result;
    }
  }

  resolveStatus(result: ReminderDeliveryResult): ReminderStatus {
    return result.delivered ? ReminderStatus.SENT : ReminderStatus.FAILED;
  }

  private async logFailureIfNeeded(payload: ReminderDeliveryPayload, result: ReminderDeliveryResult): Promise<void> {
    if (result.delivered) {
      return;
    }

    await this.fileLogService.logError({
      message: `Reminder delivery failed for ${payload.channel} to student=${payload.recipient.studentId}: ${result.failureReason ?? 'Unknown failure'}`,
    });
  }
}
