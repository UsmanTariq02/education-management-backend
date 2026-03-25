import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SUBJECT_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { SubjectRepository } from './interfaces/subject.repository.interface';

@Injectable()
export class SubjectsService {
  constructor(
    @Inject(SUBJECT_REPOSITORY)
    private readonly subjectRepository: SubjectRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(payload: CreateSubjectDto, actor: CurrentUserContext) {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }
    const subject = await this.subjectRepository.create(payload, actor.organizationId);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'subjects',
      action: 'create',
      targetId: subject.id,
      metadata: {
        name: subject.name,
        code: subject.code,
        isActive: subject.isActive,
      },
    });
    return subject;
  }

  async findAll(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.subjectRepository.findMany(
      query,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
  }

  async findOne(id: string, actor: CurrentUserContext) {
    const subject = await this.subjectRepository.findById(id);
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    if (!actor.roles.includes('SUPER_ADMIN') && subject.organizationId !== actor.organizationId) {
      throw new NotFoundException('Subject not found');
    }
    return subject;
  }

  async update(id: string, payload: UpdateSubjectDto, actor: CurrentUserContext) {
    const subject = await this.subjectRepository.update(
      id,
      payload,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'subjects',
      action: 'update',
      targetId: id,
      metadata: {
        name: subject.name,
        code: subject.code,
        isActive: subject.isActive,
      },
    });
    return subject;
  }

  async delete(id: string, actor: CurrentUserContext): Promise<void> {
    await this.subjectRepository.delete(
      id,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'subjects',
      action: 'delete',
      targetId: id,
      metadata: { deleted: true },
    });
  }
}
