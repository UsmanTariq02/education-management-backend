import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FeeRecordStatus, ReminderAutomationTrigger, ReminderChannel } from '@prisma/client';
import { ReminderRepository } from './interfaces/reminder.repository.interface';
import { ReminderDeliveryService } from './reminder-delivery.service';
import { REMINDER_REPOSITORY } from '../../common/constants/injection-tokens';

@Injectable()
export class ReminderAutomationService {
  private readonly logger = new Logger(ReminderAutomationService.name);

  constructor(
    @Inject(REMINDER_REPOSITORY)
    private readonly reminderRepository: ReminderRepository,
    private readonly reminderDeliveryService: ReminderDeliveryService,
  ) {}

  async syncSchedulesForFeeRecord(organizationId: string, feeRecordId: string): Promise<void> {
    const providerSetting = await this.reminderRepository.getProviderSetting(organizationId);
    if (!providerSetting?.autoRemindersEnabled) {
      return;
    }

    const feeRecord = await this.reminderRepository.findFeeRecordForAutomation(feeRecordId, organizationId);
    if (!feeRecord) {
      return;
    }

    if (feeRecord.status === FeeRecordStatus.PAID || feeRecord.status === FeeRecordStatus.WAIVED) {
      await this.reminderRepository.cancelSchedulesForFeeRecord(
        organizationId,
        feeRecordId,
        `Fee record resolved with status ${feeRecord.status}`,
      );

      if (providerSetting.paymentConfirmationEnabled) {
        await this.sendPaymentReceivedNotifications(organizationId, feeRecordId);
      }
      return;
    }

    const dueDate = new Date(feeRecord.year, feeRecord.month - 1, feeRecord.feePlan.dueDay, 9, 0, 0);
    const trigger =
      dueDate.getTime() <= Date.now() ? ReminderAutomationTrigger.FEE_OVERDUE : ReminderAutomationTrigger.FEE_DUE;
    const rules = await this.reminderRepository.findActiveRulesForTrigger(organizationId, trigger);

    for (const rule of rules) {
      await this.reminderRepository.upsertSchedule({
        organizationId,
        ruleId: rule.id,
        templateId: rule.templateId,
        studentId: feeRecord.studentId,
        feeRecordId,
        scheduledFor: this.offsetDate(dueDate, rule.offsetDays),
      });
    }
  }

  async handleFeeRecordUpdated(organizationId: string, feeRecordId: string): Promise<void> {
    await this.syncSchedulesForFeeRecord(organizationId, feeRecordId);
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async processDueSchedules(): Promise<void> {
    const schedules = await this.reminderRepository.findDueSchedules(50);

    for (const schedule of schedules) {
      try {
        await this.reminderRepository.markScheduleProcessing(schedule.id);
        const providerSetting = await this.reminderRepository.getProviderSetting(schedule.organizationId);

        if (!providerSetting?.autoRemindersEnabled) {
          await this.reminderRepository.completeSchedule(schedule.id, {
            status: 'SKIPPED',
            failureReason: 'Auto reminders are disabled for the organization',
          });
          continue;
        }

        if (!this.isChannelEnabled(schedule.template.channel, providerSetting)) {
          await this.reminderRepository.completeSchedule(schedule.id, {
            status: 'SKIPPED',
            failureReason: `${schedule.template.channel} delivery is disabled for the organization`,
          });
          continue;
        }

        const rendered = this.renderTemplate(schedule);
        const delivery = await this.reminderDeliveryService.deliver({
          channel: schedule.template.channel,
          message: rendered.message,
          recipient: {
            studentId: schedule.student.id,
            studentName: schedule.student.fullName,
            studentEmail: schedule.student.email,
            studentPhone: schedule.student.phone,
            guardianName: schedule.student.guardianName,
            guardianEmail: schedule.student.guardianEmail,
            guardianPhone: schedule.student.guardianPhone,
          },
        });

        const reminderLog = await this.reminderRepository.create(
          {
            studentId: schedule.studentId,
            feeRecordId: schedule.feeRecordId ?? undefined,
            channel: schedule.template.channel,
            message: rendered.message,
            status: this.reminderDeliveryService.resolveStatus(delivery),
          },
          'system-automation',
          schedule.organizationId,
          {
            status: this.reminderDeliveryService.resolveStatus(delivery),
            sentAt: delivery.sentAt,
            externalReference: delivery.externalReference,
            failureReason: delivery.failureReason,
          },
        );

        await this.reminderRepository.completeSchedule(schedule.id, {
          status: reminderLog.status === 'SENT' ? 'SENT' : 'FAILED',
          failureReason: reminderLog.failureReason ?? undefined,
          reminderLogId: reminderLog.id,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown automation failure';
        this.logger.error(`Reminder schedule ${schedule.id} failed: ${message}`);
        await this.reminderRepository.completeSchedule(schedule.id, {
          status: 'FAILED',
          failureReason: message,
        });
      }
    }
  }

  private async sendPaymentReceivedNotifications(organizationId: string, feeRecordId: string): Promise<void> {
    const feeRecord = await this.reminderRepository.findFeeRecordForAutomation(feeRecordId, organizationId);
    if (!feeRecord) {
      return;
    }

    const rules = await this.reminderRepository.findActiveRulesForTrigger(
      organizationId,
      ReminderAutomationTrigger.PAYMENT_RECEIVED,
    );

    for (const rule of rules) {
      const providerSetting = await this.reminderRepository.getProviderSetting(organizationId);
      if (!providerSetting || !this.isChannelEnabled(rule.template.channel, providerSetting)) {
        continue;
      }

      const rendered = this.renderTemplate({
        template: rule.template,
        organization: { name: feeRecord.organization.name },
        student: {
          fullName: feeRecord.student.studentName,
          guardianName: feeRecord.student.guardianName,
        },
        feeRecord: {
          month: feeRecord.month,
          year: feeRecord.year,
          amountDue: feeRecord.amountDue,
          amountPaid: feeRecord.amountPaid,
          feePlan: { dueDay: feeRecord.feePlan.dueDay },
        },
      });

      const delivery = await this.reminderDeliveryService.deliver({
        channel: rule.template.channel,
        message: rendered.message,
        recipient: feeRecord.student,
      });

      await this.reminderRepository.create(
        {
          studentId: feeRecord.studentId,
          feeRecordId,
          channel: rule.template.channel,
          message: rendered.message,
          status: this.reminderDeliveryService.resolveStatus(delivery),
        },
        'system-automation',
        organizationId,
        {
          status: this.reminderDeliveryService.resolveStatus(delivery),
          sentAt: delivery.sentAt,
          externalReference: delivery.externalReference,
          failureReason: delivery.failureReason,
        },
      );
    }
  }

  private offsetDate(date: Date, days: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  private isChannelEnabled(
    channel: ReminderChannel,
    providerSetting: {
      emailEnabled: boolean;
      whatsappEnabled: boolean;
      smsEnabled: boolean;
    },
  ): boolean {
    if (channel === ReminderChannel.EMAIL) {
      return providerSetting.emailEnabled;
    }
    if (channel === ReminderChannel.WHATSAPP) {
      return providerSetting.whatsappEnabled;
    }
    if (channel === ReminderChannel.SMS) {
      return providerSetting.smsEnabled;
    }
    return true;
  }

  private renderTemplate(schedule: {
    student: {
      fullName: string;
      guardianName: string;
    };
    feeRecord: {
      amountDue: string;
      amountPaid: string;
      month: number;
      year: number;
      feePlan: { dueDay: number };
    } | null;
    organization: { name: string };
    template: { body: string; subject?: string | null };
  }): { message: string; subject?: string } {
    const amountDue = Number(schedule.feeRecord?.amountDue ?? 0);
    const amountPaid = Number(schedule.feeRecord?.amountPaid ?? 0);
    const balance = amountDue - amountPaid;
    const dueDate = schedule.feeRecord
      ? new Date(schedule.feeRecord.year, schedule.feeRecord.month - 1, schedule.feeRecord.feePlan.dueDay)
      : null;
    const billingCycle = schedule.feeRecord ? `${schedule.feeRecord.month}/${schedule.feeRecord.year}` : '';

    const replacements: Record<string, string> = {
      studentName: schedule.student.fullName,
      guardianName: schedule.student.guardianName,
      dueAmount: amountDue.toFixed(2),
      totalFee: amountDue.toFixed(2),
      amountPaid: amountPaid.toFixed(2),
      paidFee: amountPaid.toFixed(2),
      balance: balance.toFixed(2),
      pendingFee: balance.toFixed(2),
      dueDate: dueDate ? dueDate.toISOString().slice(0, 10) : '',
      organizationName: schedule.organization.name,
      month: String(schedule.feeRecord?.month ?? ''),
      year: String(schedule.feeRecord?.year ?? ''),
      billingCycle,
      duration: billingCycle,
    };

    const render = (value: string) =>
      Object.entries(replacements).reduce(
        (accumulator, [key, replacement]) => accumulator.replaceAll(`{{${key}}}`, replacement),
        value,
      );

    return {
      message: render(schedule.template.body),
      subject: schedule.template.subject ? render(schedule.template.subject) : undefined,
    };
  }
}
