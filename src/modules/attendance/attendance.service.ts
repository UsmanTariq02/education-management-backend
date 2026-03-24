import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ATTENDANCE_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { AttendanceRepository } from './interfaces/attendance.repository.interface';

@Injectable()
export class AttendanceService {
  constructor(
    @Inject(ATTENDANCE_REPOSITORY)
    private readonly attendanceRepository: AttendanceRepository,
    private readonly auditLogService: AuditLogService,
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

  private resolveOrganizationId(actor: CurrentUserContext): string {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }

    return actor.organizationId;
  }
}
