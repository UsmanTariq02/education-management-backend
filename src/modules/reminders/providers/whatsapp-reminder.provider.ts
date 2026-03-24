import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfiguration } from '../../../config/configuration';
import {
  ReminderDeliveryPayload,
  ReminderDeliveryProvider,
  ReminderDeliveryResult,
} from '../interfaces/reminder-delivery-provider.interface';

@Injectable()
export class WhatsAppReminderProvider implements ReminderDeliveryProvider {
  constructor(private readonly configService: ConfigService<AppConfiguration, true>) {}

  async send(payload: ReminderDeliveryPayload): Promise<ReminderDeliveryResult> {
    const apiKey = this.configService.get('notifications.whatsappCallmebotApiKey', { infer: true });
    const phone = this.normalizePhone(payload.recipient.guardianPhone || payload.recipient.studentPhone);

    if (!phone) {
      return {
        delivered: false,
        failureReason: 'Recipient WhatsApp phone is not available',
      };
    }

    if (!apiKey) {
      return {
        delivered: false,
        failureReason: 'WhatsApp CallMeBot API key is not configured',
      };
    }

    const url = new URL('https://api.callmebot.com/whatsapp.php');
    url.searchParams.set('phone', phone);
    url.searchParams.set('text', payload.message);
    url.searchParams.set('apikey', apiKey);

    const response = await fetch(url.toString(), { method: 'GET' });

    if (!response.ok) {
      return {
        delivered: false,
        failureReason: `WhatsApp delivery failed with status ${response.status}`,
      };
    }

    return {
      delivered: true,
      sentAt: new Date(),
      externalReference: `${phone}:${Date.now()}`,
    };
  }

  private normalizePhone(value: string | null | undefined): string | null {
    if (!value) {
      return null;
    }

    const digits = value.replace(/\D/g, '');
    return digits.length >= 10 ? digits : null;
  }
}
