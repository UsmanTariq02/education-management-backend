import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EXAM_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { ExamRepository } from './interfaces/exam.repository.interface';

@Injectable()
export class ExamsService {
  constructor(
    @Inject(EXAM_REPOSITORY) private readonly examRepository: ExamRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(payload: CreateExamDto, actor: CurrentUserContext) {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }
    const exam = await this.examRepository.create(payload, actor.organizationId);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'exams',
      action: 'create',
      targetId: exam.id,
      metadata: { name: exam.name, code: exam.code, batchId: exam.batchId, isPublished: exam.isPublished },
    });
    return exam;
  }

  async findAll(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.examRepository.findMany(
      query,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
  }

  async findOne(id: string, actor: CurrentUserContext) {
    const exam = await this.examRepository.findById(id);
    if (!exam || (!actor.roles.includes('SUPER_ADMIN') && exam.organizationId !== actor.organizationId)) {
      throw new NotFoundException('Exam not found');
    }
    return exam;
  }

  async update(id: string, payload: UpdateExamDto, actor: CurrentUserContext) {
    const exam = await this.examRepository.update(
      id,
      payload,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'exams',
      action: 'update',
      targetId: id,
      metadata: { name: exam.name, code: exam.code, batchId: exam.batchId, isPublished: exam.isPublished },
    });
    return exam;
  }

  async delete(id: string, actor: CurrentUserContext): Promise<void> {
    await this.examRepository.delete(id, actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined));
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'exams',
      action: 'delete',
      targetId: id,
      metadata: { deleted: true },
    });
  }
}
