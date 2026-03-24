import {
  ReminderLog,
  ReminderProviderSetting,
  ReminderRule,
  ReminderSchedule,
  ReminderTemplate,
} from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateReminderDto } from '../dto/create-reminder.dto';
import { CreateReminderRuleDto } from '../dto/create-reminder-rule.dto';
import { CreateReminderTemplateDto } from '../dto/create-reminder-template.dto';
import { UpdateReminderRuleDto } from '../dto/update-reminder-rule.dto';
import { UpdateReminderTemplateDto } from '../dto/update-reminder-template.dto';
import { UpdateReminderDto } from '../dto/update-reminder.dto';
import { UpsertReminderProviderSettingDto } from '../dto/upsert-reminder-provider-setting.dto';
import { ReminderDeliveryContext } from './reminder-delivery-context.interface';

export interface ReminderRepository {
  create(
    payload: CreateReminderDto,
    sentByUserId: string | undefined,
    organizationId: string,
    delivery: {
      status: ReminderLog['status'];
      sentAt?: Date;
      externalReference?: string;
      failureReason?: string;
    },
  ): Promise<ReminderLog>;
  findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<ReminderLog>>;
  update(id: string, payload: UpdateReminderDto, organizationId?: string): Promise<ReminderLog>;
  delete(id: string, organizationId?: string): Promise<void>;
  getDeliveryContext(studentId: string, organizationId?: string): Promise<ReminderDeliveryContext | null>;
  listTemplates(query: PaginationQueryDto, organizationId: string): Promise<PaginatedResult<ReminderTemplate>>;
  createTemplate(payload: CreateReminderTemplateDto, organizationId: string): Promise<ReminderTemplate>;
  updateTemplate(id: string, payload: UpdateReminderTemplateDto, organizationId: string): Promise<ReminderTemplate>;
  listRules(query: PaginationQueryDto, organizationId: string): Promise<PaginatedResult<ReminderRule>>;
  createRule(payload: CreateReminderRuleDto, organizationId: string): Promise<ReminderRule>;
  updateRule(id: string, payload: UpdateReminderRuleDto, organizationId: string): Promise<ReminderRule>;
  getProviderSetting(organizationId: string): Promise<ReminderProviderSetting | null>;
  upsertProviderSetting(
    organizationId: string,
    payload: UpsertReminderProviderSettingDto,
  ): Promise<ReminderProviderSetting>;
  findFeeRecordForAutomation(
    feeRecordId: string,
    organizationId: string,
  ): Promise<{
    id: string;
    organizationId: string;
    studentId: string;
    month: number;
    year: number;
    amountDue: string;
    amountPaid: string;
    status: string;
    paidAt: Date | null;
    student: ReminderDeliveryContext;
    feePlan: { dueDay: number };
    organization: { name: string };
  } | null>;
  findActiveRulesForTrigger(
    organizationId: string,
    trigger: 'FEE_DUE' | 'FEE_OVERDUE' | 'PAYMENT_RECEIVED',
  ): Promise<Array<ReminderRule & { template: ReminderTemplate }>>;
  upsertSchedule(payload: {
    organizationId: string;
    ruleId: string;
    templateId: string;
    studentId: string;
    feeRecordId?: string;
    scheduledFor: Date;
  }): Promise<ReminderSchedule>;
  cancelSchedulesForFeeRecord(
    organizationId: string,
    feeRecordId: string,
    reason: string,
  ): Promise<number>;
  findDueSchedules(limit: number): Promise<
    Array<
      ReminderSchedule & {
        template: ReminderTemplate;
        student: {
          id: string;
          fullName: string;
          email: string | null;
          phone: string;
          guardianName: string;
          guardianEmail: string | null;
          guardianPhone: string;
        };
        feeRecord: {
          id: string;
          month: number;
          year: number;
          amountDue: string;
          amountPaid: string;
          status: string;
          feePlan: { dueDay: number };
        } | null;
        organization: { name: string };
      }
    >
  >;
  markScheduleProcessing(id: string): Promise<void>;
  completeSchedule(
    id: string,
    payload: { status: 'SENT' | 'FAILED' | 'SKIPPED'; failureReason?: string; reminderLogId?: string },
  ): Promise<void>;
  provisionDefaultAssets(
    organizationId: string,
    options?: {
      overwriteTemplates?: boolean;
    },
  ): Promise<{
    templatesCreated: number;
    templatesUpdated: number;
    rulesCreated: number;
  }>;
}
