import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ACADEMIC_SESSION_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateAcademicSessionDto } from './dto/create-academic-session.dto';
import { UpdateAcademicSessionDto } from './dto/update-academic-session.dto';
import { AcademicSessionRepository } from './interfaces/academic-session.repository.interface';

@Injectable()
export class AcademicSessionsService {
  constructor(
    @Inject(ACADEMIC_SESSION_REPOSITORY)
    private readonly academicSessionRepository: AcademicSessionRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(payload: CreateAcademicSessionDto, actor: CurrentUserContext) {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }

    const session = await this.academicSessionRepository.create(payload, actor.organizationId);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'academic-sessions',
      action: 'create',
      targetId: session.id,
      metadata: {
        name: session.name,
        code: session.code,
        isCurrent: session.isCurrent,
        isActive: session.isActive,
      },
    });
    return session;
  }

  async findAll(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.academicSessionRepository.findMany(
      query,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
  }

  async findOne(id: string, actor: CurrentUserContext) {
    const session = await this.academicSessionRepository.findById(id);
    if (!session) {
      throw new NotFoundException('Academic session not found');
    }
    if (!actor.roles.includes('SUPER_ADMIN') && session.organizationId !== actor.organizationId) {
      throw new NotFoundException('Academic session not found');
    }
    return session;
  }

  async update(id: string, payload: UpdateAcademicSessionDto, actor: CurrentUserContext) {
    const session = await this.academicSessionRepository.update(
      id,
      payload,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'academic-sessions',
      action: 'update',
      targetId: id,
      metadata: {
        name: session.name,
        code: session.code,
        isCurrent: session.isCurrent,
        isActive: session.isActive,
      },
    });
    return session;
  }

  async delete(id: string, actor: CurrentUserContext): Promise<void> {
    await this.academicSessionRepository.delete(
      id,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'academic-sessions',
      action: 'delete',
      targetId: id,
      metadata: { deleted: true },
    });
  }
}
