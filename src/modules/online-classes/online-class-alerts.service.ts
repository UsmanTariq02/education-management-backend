import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { AppConfiguration } from '../../config/configuration';

type AlertRecipient = {
  email: string;
  firstName?: string | null;
};

type OnlineClassEmailAlert = {
  subject: string;
  heading: string;
  message: string;
  actionLabel: string;
  actionUrl?: string;
};

@Injectable()
export class OnlineClassAlertsService {
  private transporterPromise: Promise<nodemailer.Transporter> | null = null;

  constructor(private readonly configService: ConfigService<AppConfiguration, true>) {}

  async sendAlert(
    recipients: AlertRecipient[],
    payload: OnlineClassEmailAlert,
  ): Promise<{ delivered: boolean; sentCount: number; failureReason?: string }> {
    const uniqueRecipients = [...new Set(recipients.map((recipient) => recipient.email.trim()).filter(Boolean))];
    if (!uniqueRecipients.length) {
      return { delivered: false, sentCount: 0, failureReason: 'No alert recipients available' };
    }

    const smtpHost = this.configService.get('notifications.smtpHost', { infer: true }).trim();
    const smtpFromEmail = this.configService.get('notifications.smtpFromEmail', { infer: true }).trim();
    const smtpUser = this.configService.get('notifications.smtpUser', { infer: true }).trim();
    const smtpPass = this.configService.get('notifications.smtpPass', { infer: true }).trim();

    if (!smtpHost || !smtpFromEmail) {
      return { delivered: false, sentCount: 0, failureReason: 'SMTP provider is not configured' };
    }

    const transporter = await this.getTransporter({ smtpHost, smtpUser, smtpPass });
    await transporter.sendMail({
      from: {
        name: this.configService.get('notifications.smtpFromName', { infer: true }),
        address: smtpFromEmail,
      },
      to: uniqueRecipients,
      subject: payload.subject,
      text: `${payload.heading}\n\n${payload.message}${payload.actionUrl ? `\n\n${payload.actionLabel}: ${payload.actionUrl}` : ''}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="margin: 0 0 12px;">${payload.heading}</h2>
          <p style="margin: 0 0 16px;">${payload.message}</p>
          ${payload.actionUrl ? `<p style="margin: 0;"><a href="${payload.actionUrl}">${payload.actionLabel}</a></p>` : ''}
        </div>
      `,
    });

    return { delivered: true, sentCount: uniqueRecipients.length };
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
