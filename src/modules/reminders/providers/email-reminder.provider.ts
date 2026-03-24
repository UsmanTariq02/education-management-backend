import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { AppConfiguration } from '../../../config/configuration';
import {
  ReminderDeliveryPayload,
  ReminderDeliveryProvider,
  ReminderDeliveryResult,
} from '../interfaces/reminder-delivery-provider.interface';

@Injectable()
export class EmailReminderProvider implements ReminderDeliveryProvider {
  private transporterPromise: Promise<nodemailer.Transporter> | null = null;

  constructor(private readonly configService: ConfigService<AppConfiguration, true>) {}

  async send(payload: ReminderDeliveryPayload): Promise<ReminderDeliveryResult> {
    const to = payload.recipient.studentEmail ?? payload.recipient.guardianEmail;

    if (!to) {
      return {
        delivered: false,
        failureReason: 'Student or guardian email is not available',
      };
    }

    const smtpHost = this.configService.get('notifications.smtpHost', { infer: true }).trim();
    const smtpFromEmail = this.configService.get('notifications.smtpFromEmail', { infer: true }).trim();
    const smtpUser = this.configService.get('notifications.smtpUser', { infer: true }).trim();
    const smtpPass = this.configService.get('notifications.smtpPass', { infer: true }).trim();

    if (!smtpHost || !smtpFromEmail) {
      return {
        delivered: false,
        failureReason: 'SMTP provider is not configured',
      };
    }

    if ((smtpUser && !smtpPass) || (!smtpUser && smtpPass)) {
      return {
        delivered: false,
        failureReason: 'SMTP credentials are incomplete',
      };
    }

    const transporter = await this.getTransporter({
      smtpHost,
      smtpUser,
      smtpPass,
    });

    const info = await transporter.sendMail({
      from: {
        name: this.configService.get('notifications.smtpFromName', { infer: true }),
        address: smtpFromEmail,
      },
      to,
      subject: `Fee reminder for ${payload.recipient.studentName}`,
      text: payload.message,
      html: `<p>${payload.message}</p>`,
    });

    return {
      delivered: true,
      sentAt: new Date(),
      externalReference: info.messageId,
    };
  }

  private async getTransporter(payload: {
    smtpHost: string;
    smtpUser: string;
    smtpPass: string;
  }): Promise<nodemailer.Transporter> {
    if (!this.transporterPromise) {
      this.transporterPromise = this.createTransporter(payload);
    }

    return this.transporterPromise;
  }

  private async createTransporter(payload: {
    smtpHost: string;
    smtpUser: string;
    smtpPass: string;
  }): Promise<nodemailer.Transporter> {
    const transporter = nodemailer.createTransport({
      host: payload.smtpHost,
      port: this.configService.get('notifications.smtpPort', { infer: true }),
      secure: this.configService.get('notifications.smtpSecure', { infer: true }),
      auth: payload.smtpUser
        ? {
            user: payload.smtpUser,
            pass: payload.smtpPass,
          }
        : undefined,
    });

    await transporter.verify();
    return transporter;
  }
}
