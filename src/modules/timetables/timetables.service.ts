import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { TIMETABLE_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateTimetableEntryDto } from './dto/create-timetable-entry.dto';
import { UpdateTimetableEntryDto } from './dto/update-timetable-entry.dto';
import { TimetableRepository } from './interfaces/timetable.repository.interface';

@Injectable()
export class TimetablesService {
  constructor(
    @Inject(TIMETABLE_REPOSITORY)
    private readonly timetableRepository: TimetableRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(payload: CreateTimetableEntryDto, actor: CurrentUserContext) {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }
    const item = await this.timetableRepository.create(payload, actor.organizationId);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'timetables',
      action: 'create',
      targetId: item.id,
      metadata: {
        batchId: item.batchId,
        subjectId: item.subjectId,
        teacherId: item.teacherId,
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
      },
    });
    return item;
  }

  async findAll(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.timetableRepository.findMany(
      query,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
  }

  async findOne(id: string, actor: CurrentUserContext) {
    const item = await this.timetableRepository.findById(id);
    if (!item) {
      throw new NotFoundException('Timetable entry not found');
    }
    if (!actor.roles.includes('SUPER_ADMIN') && item.organizationId !== actor.organizationId) {
      throw new NotFoundException('Timetable entry not found');
    }
    return item;
  }

  async update(id: string, payload: UpdateTimetableEntryDto, actor: CurrentUserContext) {
    const item = await this.timetableRepository.update(
      id,
      payload,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'timetables',
      action: 'update',
      targetId: id,
      metadata: {
        batchId: item.batchId,
        subjectId: item.subjectId,
        teacherId: item.teacherId,
        dayOfWeek: item.dayOfWeek,
        startTime: item.startTime,
      },
    });
    return item;
  }

  async delete(id: string, actor: CurrentUserContext): Promise<void> {
    await this.timetableRepository.delete(
      id,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'timetables',
      action: 'delete',
      targetId: id,
      metadata: { deleted: true },
    });
  }
}
