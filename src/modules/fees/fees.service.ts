import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { FEE_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateFeePlanDto } from './dto/create-fee-plan.dto';
import { CreateFeeRecordDto } from './dto/create-fee-record.dto';
import { UpdateFeeRecordDto } from './dto/update-fee-record.dto';
import { FeeRepository } from './interfaces/fee.repository.interface';
import { ReminderAutomationService } from '../reminders/reminder-automation.service';

@Injectable()
export class FeesService {
  constructor(
    @Inject(FEE_REPOSITORY)
    private readonly feeRepository: FeeRepository,
    private readonly reminderAutomationService: ReminderAutomationService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async createPlan(payload: CreateFeePlanDto, actor: CurrentUserContext) {
    const organizationId = this.resolveOrganizationId(actor);
    const plan = await this.feeRepository.createPlan(payload, organizationId);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'fees',
      action: 'create-plan',
      targetId: plan.id,
      metadata: {
        studentId: plan.studentId,
        batchId: plan.batchId,
        dueDay: plan.dueDay,
        isActive: plan.isActive,
      },
    });
    return plan;
  }

  async listPlans(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.feeRepository.listPlans(query, actor.roles.includes('SUPER_ADMIN') ? undefined : this.resolveOrganizationId(actor));
  }

  async createRecord(payload: CreateFeeRecordDto, actor: CurrentUserContext) {
    const organizationId = this.resolveOrganizationId(actor);
    const record = await this.feeRepository.createRecord(payload, organizationId);
    await this.reminderAutomationService.syncSchedulesForFeeRecord(organizationId, record.id);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'fees',
      action: 'create-record',
      targetId: record.id,
      metadata: {
        studentId: record.studentId,
        feePlanId: record.feePlanId,
        month: record.month,
        year: record.year,
        status: record.status,
      },
    });
    return record;
  }

  async listRecords(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.feeRepository.listRecords(query, actor.roles.includes('SUPER_ADMIN') ? undefined : this.resolveOrganizationId(actor));
  }

  async updateRecord(id: string, payload: UpdateFeeRecordDto, actor: CurrentUserContext) {
    const organizationId = actor.roles.includes('SUPER_ADMIN') ? undefined : this.resolveOrganizationId(actor);
    const record = await this.feeRepository.updateRecord(
      id,
      payload,
      organizationId,
    );
    if (record.organizationId) {
      await this.reminderAutomationService.handleFeeRecordUpdated(record.organizationId, record.id);
    }
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'fees',
      action: 'update-record',
      targetId: id,
      metadata: {
        status: record.status,
        amountPaid: record.amountPaid.toString(),
        paymentMethod: record.paymentMethod,
      },
    });
    return record;
  }

  async deleteRecord(id: string, actor: CurrentUserContext): Promise<void> {
    await this.feeRepository.deleteRecord(id, actor.roles.includes('SUPER_ADMIN') ? undefined : this.resolveOrganizationId(actor));
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'fees',
      action: 'delete-record',
      targetId: id,
      metadata: { deleted: true },
    });
  }

  private resolveOrganizationId(actor: CurrentUserContext): string {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }

    return actor.organizationId;
  }
}
