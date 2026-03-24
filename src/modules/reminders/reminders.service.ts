import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ReminderChannel } from '@prisma/client';
import { REMINDER_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { CreateReminderRuleDto } from './dto/create-reminder-rule.dto';
import { CreateReminderTemplateDto } from './dto/create-reminder-template.dto';
import { UpdateReminderRuleDto } from './dto/update-reminder-rule.dto';
import { UpdateReminderTemplateDto } from './dto/update-reminder-template.dto';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { UpsertReminderProviderSettingDto } from './dto/upsert-reminder-provider-setting.dto';
import { ReminderAutomationService } from './reminder-automation.service';
import { ReminderDeliveryService } from './reminder-delivery.service';
import { ReminderRepository } from './interfaces/reminder.repository.interface';

@Injectable()
export class RemindersService {
  constructor(
    @Inject(REMINDER_REPOSITORY)
    private readonly reminderRepository: ReminderRepository,
    private readonly reminderDeliveryService: ReminderDeliveryService,
    private readonly reminderAutomationService: ReminderAutomationService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(payload: CreateReminderDto, actor: CurrentUserContext) {
    const organizationId = this.resolveOrganizationId(actor);
    const providerSetting = await this.reminderRepository.getProviderSetting(organizationId);
    if (providerSetting && !this.isChannelEnabled(payload.channel, providerSetting)) {
      throw new BadRequestException(`${payload.channel} reminders are disabled for this organization`);
    }
    const recipient = await this.reminderRepository.getDeliveryContext(
      payload.studentId,
      actor.roles.includes('SUPER_ADMIN') ? undefined : organizationId,
    );

    if (!recipient) {
      throw new NotFoundException('Student for reminder delivery was not found');
    }

    const delivery = await this.reminderDeliveryService.deliver({
      channel: payload.channel,
      message: payload.message,
      recipient,
    });
    const reminder = await this.reminderRepository.create(payload, actor.userId, organizationId, {
      status: this.reminderDeliveryService.resolveStatus(delivery),
      sentAt: delivery.sentAt,
      externalReference: delivery.externalReference,
      failureReason: delivery.failureReason,
    });

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'reminders',
      action: 'create',
      targetId: reminder.id,
      metadata: {
        studentId: reminder.studentId,
        feeRecordId: reminder.feeRecordId,
        channel: reminder.channel,
        status: reminder.status,
        deliveryReference: reminder.deliveryReference,
        failureReason: reminder.failureReason,
      },
    });
    return reminder;
  }

  async findAll(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.reminderRepository.findMany(query, actor.roles.includes('SUPER_ADMIN') ? undefined : this.resolveOrganizationId(actor));
  }

  async update(id: string, payload: UpdateReminderDto, actor: CurrentUserContext) {
    const reminder = await this.reminderRepository.update(
      id,
      payload,
      actor.roles.includes('SUPER_ADMIN') ? undefined : this.resolveOrganizationId(actor),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'reminders',
      action: 'update',
      targetId: id,
      metadata: {
        channel: reminder.channel,
        status: reminder.status,
      },
    });
    return reminder;
  }

  async delete(id: string, actor: CurrentUserContext): Promise<void> {
    await this.reminderRepository.delete(id, actor.roles.includes('SUPER_ADMIN') ? undefined : this.resolveOrganizationId(actor));
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'reminders',
      action: 'delete',
      targetId: id,
      metadata: { deleted: true },
    });
  }

  async listTemplates(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.reminderRepository.listTemplates(query, this.resolveOrganizationId(actor));
  }

  async createTemplate(payload: CreateReminderTemplateDto, actor: CurrentUserContext) {
    const template = await this.reminderRepository.createTemplate(payload, this.resolveOrganizationId(actor));
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'reminder-templates',
      action: 'create',
      targetId: template.id,
      metadata: { code: template.code, channel: template.channel, active: template.isActive },
    });
    return template;
  }

  async updateTemplate(id: string, payload: UpdateReminderTemplateDto, actor: CurrentUserContext) {
    const template = await this.reminderRepository.updateTemplate(id, payload, this.resolveOrganizationId(actor));
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'reminder-templates',
      action: 'update',
      targetId: template.id,
      metadata: { code: template.code, channel: template.channel, active: template.isActive },
    });
    return template;
  }

  async resetDefaultTemplates(actor: CurrentUserContext): Promise<{
    reset: boolean;
    templatesCreated: number;
    templatesUpdated: number;
    rulesCreated: number;
  }> {
    const organizationId = this.resolveOrganizationId(actor);
    const result = await this.reminderRepository.provisionDefaultAssets(organizationId, {
      overwriteTemplates: true,
    });

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'reminder-templates',
      action: 'reset-defaults',
      metadata: result,
    });

    return {
      reset: true,
      ...result,
    };
  }

  async listRules(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.reminderRepository.listRules(query, this.resolveOrganizationId(actor));
  }

  async createRule(payload: CreateReminderRuleDto, actor: CurrentUserContext) {
    const rule = await this.reminderRepository.createRule(payload, this.resolveOrganizationId(actor));
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'reminder-rules',
      action: 'create',
      targetId: rule.id,
      metadata: { trigger: rule.trigger, templateId: rule.templateId, offsetDays: rule.offsetDays },
    });
    return rule;
  }

  async updateRule(id: string, payload: UpdateReminderRuleDto, actor: CurrentUserContext) {
    const rule = await this.reminderRepository.updateRule(id, payload, this.resolveOrganizationId(actor));
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'reminder-rules',
      action: 'update',
      targetId: rule.id,
      metadata: { trigger: rule.trigger, templateId: rule.templateId, offsetDays: rule.offsetDays },
    });
    return rule;
  }

  async getProviderSetting(actor: CurrentUserContext) {
    const organizationId = this.resolveOrganizationId(actor);
    const existingSetting = await this.reminderRepository.getProviderSetting(organizationId);

    if (existingSetting) {
      return existingSetting;
    }

    return this.reminderRepository.upsertProviderSetting(organizationId, {
      autoRemindersEnabled: false,
      emailEnabled: false,
      whatsappEnabled: false,
      smsEnabled: false,
      paymentConfirmationEnabled: false,
    });
  }

  async upsertProviderSetting(payload: UpsertReminderProviderSettingDto, actor: CurrentUserContext) {
    const setting = await this.reminderRepository.upsertProviderSetting(this.resolveOrganizationId(actor), payload);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'reminder-provider-settings',
      action: 'upsert',
      targetId: setting.id,
      metadata: {
        autoRemindersEnabled: setting.autoRemindersEnabled,
        emailEnabled: setting.emailEnabled,
        whatsappEnabled: setting.whatsappEnabled,
        smsEnabled: setting.smsEnabled,
        paymentConfirmationEnabled: setting.paymentConfirmationEnabled,
      },
    });
    return setting;
  }

  async processDueSchedules(actor: CurrentUserContext): Promise<{ processed: boolean }> {
    await this.reminderAutomationService.processDueSchedules();
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'reminder-automation',
      action: 'process-due-schedules',
      metadata: { triggeredManually: true },
    });
    return { processed: true };
  }

  private resolveOrganizationId(actor: CurrentUserContext): string {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }

    return actor.organizationId;
  }

  private isChannelEnabled(
    channel: ReminderChannel,
    providerSetting: { emailEnabled: boolean; whatsappEnabled: boolean; smsEnabled: boolean },
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
}
