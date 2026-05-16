import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ATTENDANCE_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { BulkCreateAttendanceDto } from './dto/bulk-create-attendance.dto';
import { BulkUpdateAttendanceStatusDto } from './dto/bulk-update-attendance-status.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceRepository } from './interfaces/attendance.repository.interface';
import {
  AttendanceAlertAutomationService,
  AttendanceFollowUpAutomationSummary,
} from './attendance-alert-automation.service';

@Injectable()
export class AttendanceService {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendanceRepository: AttendanceRepository,
    private readonly auditLogService: AuditLogService,
    private readonly attendanceAlertAutomationService: AttendanceAlertAutomationService,
  ) {}

  async create(payload: CreateAttendanceDto, actor: CurrentUserContext) {
    const attendance = await this.attendanceRepository.create(payload, this.resolveOrganizationId(actor));
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'attendance',
      action: 'create',
      targetId: attendance.id,
      metadata: {
        studentId: attendance.studentId,
        batchId: attendance.batchId,
        status: attendance.status,
        attendanceDate: attendance.attendanceDate.toISOString(),
      },
    });
    return attendance;
  }

  async bulkCreate(payload: BulkCreateAttendanceDto, actor: CurrentUserContext): Promise<{ createdCount: number }> {
    const organizationId = this.resolveOrganizationId(actor);
    const created = await this.attendanceRepository.createMany(payload.items, organizationId);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'attendance',
      action: 'bulk-create',
      metadata: {
        createdCount: created.length,
        itemCount: payload.items.length,
        statusBreakdown: payload.items.reduce<Record<string, number>>((acc, item) => {
          acc[item.status] = (acc[item.status] ?? 0) + 1;
          return acc;
        }, {}),
      },
    });
    return { createdCount: created.length };
  }

  async findAll(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.attendanceRepository.findMany(query, actor.roles.includes('SUPER_ADMIN') ? undefined : this.resolveOrganizationId(actor));
  }

  async update(id: string, payload: UpdateAttendanceDto, actor: CurrentUserContext) {
    const attendance = await this.attendanceRepository.update(
      id,
      payload,
      actor.roles.includes('SUPER_ADMIN') ? undefined : this.resolveOrganizationId(actor),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'attendance',
      action: 'update',
      targetId: id,
      metadata: {
        studentId: attendance.studentId,
        batchId: attendance.batchId,
        status: attendance.status,
        attendanceDate: attendance.attendanceDate.toISOString(),
      },
    });
    return attendance;
  }

  async delete(id: string, actor: CurrentUserContext): Promise<void> {
    await this.attendanceRepository.delete(id, actor.roles.includes('SUPER_ADMIN') ? undefined : this.resolveOrganizationId(actor));
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'attendance',
      action: 'delete',
      targetId: id,
      metadata: { deleted: true },
    });
  }

  async bulkDelete(ids: string[], actor: CurrentUserContext): Promise<{ deletedCount: number }> {
    const uniqueIds = Array.from(new Set(ids));
    const deletedCount = await this.attendanceRepository.deleteMany(
      uniqueIds,
      actor.roles.includes('SUPER_ADMIN') ? undefined : this.resolveOrganizationId(actor),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'attendance',
      action: 'bulk-delete',
      metadata: { ids: uniqueIds, deletedCount },
    });
    return { deletedCount };
  }

  async bulkUpdateStatus(payload: BulkUpdateAttendanceStatusDto, actor: CurrentUserContext): Promise<{ updatedCount: number; status: string }> {
    const uniqueIds = Array.from(new Set(payload.ids));
    const updatedCount = await this.attendanceRepository.updateManyStatus(
      uniqueIds,
      payload.status,
      actor.roles.includes('SUPER_ADMIN') ? undefined : this.resolveOrganizationId(actor),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'attendance',
      action: 'bulk-status',
      metadata: { ids: uniqueIds, updatedCount, status: payload.status },
    });
    return { updatedCount, status: payload.status };
  }

  async processFollowUps(actor: CurrentUserContext): Promise<AttendanceFollowUpAutomationSummary> {
    const organizationId = actor.roles.includes('SUPER_ADMIN') && !actor.organizationId ? undefined : this.resolveOrganizationId(actor);
    return this.attendanceAlertAutomationService.processFollowUps(organizationId, actor.userId);
  }

  private resolveOrganizationId(actor: CurrentUserContext): string {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }

    return actor.organizationId;
  }
}
