import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EXAM_RESULT_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateExamResultDto } from './dto/create-exam-result.dto';
import { UpdateExamResultDto } from './dto/update-exam-result.dto';
import { ExamResultRepository } from './interfaces/exam-result.repository.interface';

@Injectable()
export class ExamResultsService {
  constructor(
    @Inject(EXAM_RESULT_REPOSITORY) private readonly examResultRepository: ExamResultRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(payload: CreateExamResultDto, actor: CurrentUserContext) {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }
    const result = await this.examResultRepository.create(payload, actor.organizationId);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'exam-results',
      action: 'create',
      targetId: result.id,
      metadata: { examId: result.examId, studentId: result.studentId, percentage: result.percentage, status: result.status },
    });
    return result;
  }

  async findAll(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.examResultRepository.findMany(
      query,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
  }

  async findOne(id: string, actor: CurrentUserContext) {
    const result = await this.examResultRepository.findById(id);
    if (!result || (!actor.roles.includes('SUPER_ADMIN') && result.organizationId !== actor.organizationId)) {
      throw new NotFoundException('Exam result not found');
    }
    return result;
  }

  async update(id: string, payload: UpdateExamResultDto, actor: CurrentUserContext) {
    const result = await this.examResultRepository.update(
      id,
      payload,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'exam-results',
      action: 'update',
      targetId: id,
      metadata: { examId: result.examId, studentId: result.studentId, percentage: result.percentage, status: result.status },
    });
    return result;
  }

  async delete(id: string, actor: CurrentUserContext): Promise<void> {
    await this.examResultRepository.delete(id, actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined));
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'exam-results',
      action: 'delete',
      targetId: id,
      metadata: { deleted: true },
    });
  }
}
