import { Injectable } from '@nestjs/common';
import {
  ReminderAutomationTrigger,
  ReminderLog,
  ReminderProviderSetting,
  ReminderRule,
  ReminderSchedule,
  ReminderScheduleStatus,
  ReminderStatus,
  ReminderTemplate,
} from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateReminderDto } from '../dto/create-reminder.dto';
import { CreateReminderRuleDto } from '../dto/create-reminder-rule.dto';
import { CreateReminderTemplateDto } from '../dto/create-reminder-template.dto';
import { UpdateReminderRuleDto } from '../dto/update-reminder-rule.dto';
import { UpdateReminderTemplateDto } from '../dto/update-reminder-template.dto';
import { UpdateReminderDto } from '../dto/update-reminder.dto';
import { UpsertReminderProviderSettingDto } from '../dto/upsert-reminder-provider-setting.dto';
import { ReminderDeliveryContext } from '../interfaces/reminder-delivery-context.interface';
import { ReminderRepository } from '../interfaces/reminder.repository.interface';

const defaultReminderTemplates = [
  {
    key: 'fee-due-whatsapp',
    name: 'Fee Due WhatsApp',
    code: 'fee-due-whatsapp',
    channel: 'WHATSAPP' as const,
    target: 'GUARDIAN' as const,
    subject: null,
    body:
      'Assalam o Alaikum {{guardianName}}, this is a fee reminder from {{organizationName}} for {{studentName}}. Billing cycle: {{billingCycle}}. Total fee: {{totalFee}}. Paid fee: {{paidFee}}. Pending fee: {{pendingFee}}. Due date: {{dueDate}}. Please contact the school administration if payment has already been made or if you need any clarification.',
  },
  {
    key: 'fee-overdue-whatsapp',
    name: 'Fee Overdue WhatsApp',
    code: 'fee-overdue-whatsapp',
    channel: 'WHATSAPP' as const,
    target: 'GUARDIAN' as const,
    subject: null,
    body:
      'Assalam o Alaikum {{guardianName}}, {{studentName}} still has pending dues at {{organizationName}}. Billing cycle: {{billingCycle}}. Total fee: {{totalFee}}. Paid fee: {{paidFee}}. Pending fee: {{pendingFee}}. Original due date: {{dueDate}}. Kindly clear the outstanding amount as soon as possible or contact the school administration for assistance.',
  },
  {
    key: 'payment-confirmation-email',
    name: 'Payment Confirmation Email',
    code: 'payment-confirmation-email',
    channel: 'EMAIL' as const,
    target: 'BOTH' as const,
    subject: 'Payment received for {{studentName}}',
    body:
      'Dear {{guardianName}}, this is a payment confirmation from {{organizationName}} for {{studentName}}. Billing cycle: {{billingCycle}}. Total fee: {{totalFee}}. Paid fee received: {{paidFee}}. Pending fee: {{pendingFee}}. Thank you for your cooperation.',
  },
] as const;

const defaultReminderRules = [
  {
    name: 'Fee Due Reminder',
    templateKey: 'fee-due-whatsapp',
    trigger: 'FEE_DUE' as const,
    offsetDays: 0,
  },
  {
    name: 'Fee Overdue Reminder',
    templateKey: 'fee-overdue-whatsapp',
    trigger: 'FEE_OVERDUE' as const,
    offsetDays: 2,
  },
  {
    name: 'Payment Confirmation',
    templateKey: 'payment-confirmation-email',
    trigger: 'PAYMENT_RECEIVED' as const,
    offsetDays: 0,
  },
] as const;

@Injectable()
export class ReminderPrismaRepository implements ReminderRepository {
  private hasDeliveryColumnsCache: boolean | null = null;

  constructor(private readonly prisma: PrismaService) {}

  async create(
    payload: CreateReminderDto,
    sentByUserId: string | undefined,
    organizationId: string,
    delivery: {
      status: ReminderLog['status'];
      sentAt?: Date;
      externalReference?: string;
      failureReason?: string;
    },
  ): Promise<ReminderLog> {
    const hasDeliveryColumns = await this.hasDeliveryColumns();
    const reminderData: Prisma.ReminderLogUncheckedCreateInput = {
      studentId: payload.studentId,
      feeRecordId: payload.feeRecordId ?? null,
      channel: payload.channel,
      message: payload.message,
      organizationId,
      sentByUserId,
      status: delivery.status,
      sentAt: delivery.sentAt,
    };

    if (hasDeliveryColumns) {
      return this.prisma.reminderLog.create({
        data: {
          ...reminderData,
          deliveryReference: delivery.externalReference,
          failureReason: delivery.failureReason,
        },
      });
    }

    const reminder = await this.prisma.reminderLog.create({
      data: {
        ...reminderData,
      },
      select: legacyReminderSelect,
    });

    return this.toReminderLog(reminder);
  }

  async findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<ReminderLog>> {
    const hasDeliveryColumns = await this.hasDeliveryColumns();
    const where = organizationId ? { organizationId } : undefined;

    const [items, total] = await this.prisma.$transaction(async (tx) => {
      const records = hasDeliveryColumns
        ? await tx.reminderLog.findMany({
            where,
            ...buildPagination(query),
            orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
          })
        : await tx.reminderLog.findMany({
            where,
            ...buildPagination(query),
            orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
            select: legacyReminderSelect,
          });

      const count = await tx.reminderLog.count({ where });
      return [records, count] as const;
    });

    const normalizedItems: ReminderLog[] = hasDeliveryColumns
      ? (items as ReminderLog[])
      : (items as LegacyReminderRecord[]).map((item) => this.toReminderLog(item));

    return {
      items: normalizedItems,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async update(id: string, payload: UpdateReminderDto, organizationId?: string): Promise<ReminderLog> {
    const hasDeliveryColumns = await this.hasDeliveryColumns();

    if (organizationId) {
      await this.prisma.reminderLog.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }

    if (hasDeliveryColumns) {
      return this.prisma.reminderLog.update({
        where: { id },
        data: payload,
      });
    }

    const reminder = await this.prisma.reminderLog.update({
      where: { id },
      data: payload,
      select: legacyReminderSelect,
    });

    return this.toReminderLog(reminder);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    if (organizationId) {
      await this.prisma.reminderLog.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }

    await this.prisma.reminderLog.delete({ where: { id } });
  }

  async getDeliveryContext(studentId: string, organizationId?: string): Promise<ReminderDeliveryContext | null> {
    const student = await this.prisma.student.findFirst({
      where: {
        id: studentId,
        organizationId: organizationId ?? undefined,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        guardianName: true,
        guardianEmail: true,
        guardianPhone: true,
      },
    });

    if (!student) {
      return null;
    }

    return {
      studentId: student.id,
      studentName: student.fullName,
      studentEmail: student.email,
      studentPhone: student.phone,
      guardianName: student.guardianName,
      guardianEmail: student.guardianEmail,
      guardianPhone: student.guardianPhone,
    };
  }

  async listTemplates(query: PaginationQueryDto, organizationId: string): Promise<PaginatedResult<ReminderTemplate>> {
    const where: Prisma.ReminderTemplateWhereInput = {
      organizationId,
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
              { body: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.reminderTemplate.findMany({
        where,
        ...buildPagination(query),
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
      }),
      this.prisma.reminderTemplate.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async createTemplate(payload: CreateReminderTemplateDto, organizationId: string): Promise<ReminderTemplate> {
    return this.prisma.reminderTemplate.create({
      data: {
        ...payload,
        organizationId,
      },
    });
  }

  async updateTemplate(
    id: string,
    payload: UpdateReminderTemplateDto,
    organizationId: string,
  ): Promise<ReminderTemplate> {
    await this.prisma.reminderTemplate.findFirstOrThrow({
      where: { id, organizationId },
      select: { id: true },
    });

    return this.prisma.reminderTemplate.update({
      where: { id },
      data: payload,
    });
  }

  async listRules(query: PaginationQueryDto, organizationId: string): Promise<PaginatedResult<ReminderRule>> {
    const where: Prisma.ReminderRuleWhereInput = {
      organizationId,
      ...(query.search ? { name: { contains: query.search, mode: 'insensitive' } } : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.reminderRule.findMany({
        where,
        ...buildPagination(query),
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
      }),
      this.prisma.reminderRule.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async createRule(payload: CreateReminderRuleDto, organizationId: string): Promise<ReminderRule> {
    return this.prisma.reminderRule.create({
      data: {
        ...payload,
        organizationId,
      },
    });
  }

  async updateRule(id: string, payload: UpdateReminderRuleDto, organizationId: string): Promise<ReminderRule> {
    await this.prisma.reminderRule.findFirstOrThrow({
      where: { id, organizationId },
      select: { id: true },
    });

    return this.prisma.reminderRule.update({
      where: { id },
      data: payload,
    });
  }

  async getProviderSetting(organizationId: string): Promise<ReminderProviderSetting | null> {
    return this.prisma.reminderProviderSetting.findUnique({ where: { organizationId } });
  }

  async upsertProviderSetting(
    organizationId: string,
    payload: UpsertReminderProviderSettingDto,
  ): Promise<ReminderProviderSetting> {
    return this.prisma.reminderProviderSetting.upsert({
      where: { organizationId },
      update: payload,
      create: {
        organizationId,
        ...payload,
      },
    });
  }

  async findFeeRecordForAutomation(feeRecordId: string, organizationId: string) {
    const feeRecord = await this.prisma.feeRecord.findFirst({
      where: { id: feeRecordId, organizationId },
      select: {
        id: true,
        organizationId: true,
        studentId: true,
        month: true,
        year: true,
        amountDue: true,
        amountPaid: true,
        status: true,
        paidAt: true,
        feePlan: { select: { dueDay: true } },
        organization: { select: { name: true } },
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            guardianName: true,
            guardianEmail: true,
            guardianPhone: true,
          },
        },
      },
    });

    if (!feeRecord) {
      return null;
    }

    return {
      ...feeRecord,
      amountDue: feeRecord.amountDue.toString(),
      amountPaid: feeRecord.amountPaid.toString(),
      student: {
        studentId: feeRecord.student.id,
        studentName: feeRecord.student.fullName,
        studentEmail: feeRecord.student.email,
        studentPhone: feeRecord.student.phone,
        guardianName: feeRecord.student.guardianName,
        guardianEmail: feeRecord.student.guardianEmail,
        guardianPhone: feeRecord.student.guardianPhone,
      },
    };
  }

  async findActiveRulesForTrigger(organizationId: string, trigger: ReminderAutomationTrigger) {
    return this.prisma.reminderRule.findMany({
      where: {
        organizationId,
        trigger,
        isActive: true,
        template: {
          isActive: true,
        },
      },
      include: {
        template: true,
      },
      orderBy: { offsetDays: 'asc' },
    });
  }

  async upsertSchedule(payload: {
    organizationId: string;
    ruleId: string;
    templateId: string;
    studentId: string;
    feeRecordId?: string;
    scheduledFor: Date;
  }): Promise<ReminderSchedule> {
    if (!payload.feeRecordId) {
      const existingSchedule = await this.prisma.reminderSchedule.findFirst({
        where: {
          organizationId: payload.organizationId,
          ruleId: payload.ruleId,
          studentId: payload.studentId,
          feeRecordId: null,
        },
      });

      if (existingSchedule) {
        return this.prisma.reminderSchedule.update({
          where: { id: existingSchedule.id },
          data: {
            scheduledFor: payload.scheduledFor,
            status: ReminderScheduleStatus.PENDING,
            cancelledAt: null,
            processedAt: null,
            failureReason: null,
            reminderLogId: null,
          },
        });
      }

      return this.prisma.reminderSchedule.create({
        data: {
          organizationId: payload.organizationId,
          ruleId: payload.ruleId,
          templateId: payload.templateId,
          studentId: payload.studentId,
          feeRecordId: null,
          scheduledFor: payload.scheduledFor,
        },
      });
    }

    return this.prisma.reminderSchedule.upsert({
      where: {
        organizationId_ruleId_studentId_feeRecordId: {
          organizationId: payload.organizationId,
          ruleId: payload.ruleId,
          studentId: payload.studentId,
          feeRecordId: payload.feeRecordId,
        },
      },
      update: {
        scheduledFor: payload.scheduledFor,
        status: ReminderScheduleStatus.PENDING,
        cancelledAt: null,
        processedAt: null,
        failureReason: null,
        reminderLogId: null,
      },
      create: {
        organizationId: payload.organizationId,
        ruleId: payload.ruleId,
        templateId: payload.templateId,
        studentId: payload.studentId,
        feeRecordId: payload.feeRecordId,
        scheduledFor: payload.scheduledFor,
      },
    });
  }

  async cancelSchedulesForFeeRecord(organizationId: string, feeRecordId: string, reason: string): Promise<number> {
    const result = await this.prisma.reminderSchedule.updateMany({
      where: {
        organizationId,
        feeRecordId,
        status: {
          in: [ReminderScheduleStatus.PENDING, ReminderScheduleStatus.FAILED],
        },
      },
      data: {
        status: ReminderScheduleStatus.CANCELLED,
        cancelledAt: new Date(),
        failureReason: reason,
      },
    });

    return result.count;
  }

  async findDueSchedules(limit: number) {
    const schedules = await this.prisma.reminderSchedule.findMany({
      where: {
        status: ReminderScheduleStatus.PENDING,
        scheduledFor: {
          lte: new Date(),
        },
      },
      include: {
        template: true,
        organization: { select: { name: true } },
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            guardianName: true,
            guardianEmail: true,
            guardianPhone: true,
          },
        },
        feeRecord: {
          select: {
            id: true,
            month: true,
            year: true,
            amountDue: true,
            amountPaid: true,
            status: true,
            feePlan: { select: { dueDay: true } },
          },
        },
      },
      orderBy: { scheduledFor: 'asc' },
      take: limit,
    });

    return schedules.map((schedule) => ({
      ...schedule,
      feeRecord: schedule.feeRecord
        ? {
            ...schedule.feeRecord,
            amountDue: schedule.feeRecord.amountDue.toString(),
            amountPaid: schedule.feeRecord.amountPaid.toString(),
          }
        : null,
    }));
  }

  async markScheduleProcessing(id: string): Promise<void> {
    await this.prisma.reminderSchedule.update({
      where: { id },
      data: { status: ReminderScheduleStatus.PROCESSING },
    });
  }

  async completeSchedule(
    id: string,
    payload: { status: 'SENT' | 'FAILED' | 'SKIPPED'; failureReason?: string; reminderLogId?: string },
  ): Promise<void> {
    const mappedStatus =
      payload.status === 'SENT'
        ? ReminderScheduleStatus.SENT
        : payload.status === 'SKIPPED'
          ? ReminderScheduleStatus.SKIPPED
          : ReminderScheduleStatus.FAILED;

    await this.prisma.reminderSchedule.update({
      where: { id },
      data: {
        status: mappedStatus,
        processedAt: new Date(),
        failureReason: payload.failureReason,
        reminderLogId: payload.reminderLogId,
      },
    });
  }

  async provisionDefaultAssets(
    organizationId: string,
    options?: {
      overwriteTemplates?: boolean;
    },
  ): Promise<{ templatesCreated: number; templatesUpdated: number; rulesCreated: number }> {
    return this.prisma.$transaction(async (prisma) => {
      let templatesCreated = 0;
      let templatesUpdated = 0;
      let rulesCreated = 0;

      const templateMap = new Map<string, string>();

      for (const template of defaultReminderTemplates) {
        const existingTemplate = await prisma.reminderTemplate.findUnique({
          where: {
            organizationId_code_channel: {
              organizationId,
              code: template.code,
              channel: template.channel,
            },
          },
          select: { id: true },
        });

        const record = await prisma.reminderTemplate.upsert({
          where: {
            organizationId_code_channel: {
              organizationId,
              code: template.code,
              channel: template.channel,
            },
          },
          update: {},
          create: {
            organizationId,
            name: template.name,
            code: template.code,
            channel: template.channel,
            target: template.target,
            subject: template.subject,
            body: template.body,
            isActive: true,
          },
          select: { id: true, createdAt: true, updatedAt: true },
        });

        templateMap.set(template.key, record.id);
        if (!existingTemplate) {
          templatesCreated += 1;
        }

        if (options?.overwriteTemplates && existingTemplate) {
          await prisma.reminderTemplate.update({
            where: { id: record.id },
            data: {
              name: template.name,
              target: template.target,
              subject: template.subject,
              body: template.body,
              isActive: true,
            },
          });
          templatesUpdated += 1;
        }
      }

      for (const rule of defaultReminderRules) {
        const templateId = templateMap.get(rule.templateKey);
        if (!templateId) {
          continue;
        }

        const existingRule = await prisma.reminderRule.findFirst({
          where: {
            organizationId,
            name: rule.name,
          },
          select: { id: true },
        });

        if (existingRule) {
          continue;
        }

        await prisma.reminderRule.create({
          data: {
            organizationId,
            name: rule.name,
            templateId,
            trigger: rule.trigger,
            offsetDays: rule.offsetDays,
            isActive: true,
          },
        });

          rulesCreated += 1;
      }

      return { templatesCreated, templatesUpdated, rulesCreated };
    });
  }

  private async hasDeliveryColumns(): Promise<boolean> {
    if (this.hasDeliveryColumnsCache !== null) {
      return this.hasDeliveryColumnsCache;
    }

    const result = await this.prisma.$queryRaw<Array<{ exists: boolean }>>(Prisma.sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'ReminderLog'
          AND column_name = 'deliveryReference'
      ) AS "exists"
    `);

    this.hasDeliveryColumnsCache = result[0]?.exists ?? false;
    return this.hasDeliveryColumnsCache;
  }

  private toReminderLog(reminder: LegacyReminderRecord): ReminderLog {
    return {
      ...reminder,
      deliveryReference: null,
      failureReason: null,
    };
  }
}

const legacyReminderSelect = {
  id: true,
  organizationId: true,
  studentId: true,
  feeRecordId: true,
  channel: true,
  message: true,
  sentByUserId: true,
  sentAt: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ReminderLogSelect;

type LegacyReminderRecord = Prisma.ReminderLogGetPayload<{
  select: typeof legacyReminderSelect;
}>;
