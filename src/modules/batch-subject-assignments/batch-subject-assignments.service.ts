import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { BATCH_SUBJECT_ASSIGNMENT_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateBatchSubjectAssignmentDto } from './dto/create-batch-subject-assignment.dto';
import { UpdateBatchSubjectAssignmentDto } from './dto/update-batch-subject-assignment.dto';
import { BatchSubjectAssignmentRepository } from './interfaces/batch-subject-assignment.repository.interface';

@Injectable()
export class BatchSubjectAssignmentsService {
  constructor(
    @Inject(BATCH_SUBJECT_ASSIGNMENT_REPOSITORY)
    private readonly assignmentRepository: BatchSubjectAssignmentRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(payload: CreateBatchSubjectAssignmentDto, actor: CurrentUserContext) {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }
    const assignment = await this.assignmentRepository.create(payload, actor.organizationId);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'batch-subject-assignments',
      action: 'create',
      targetId: assignment.id,
      metadata: {
        batchId: assignment.batchId,
        subjectId: assignment.subjectId,
        teacherId: assignment.teacherId,
        academicSessionId: assignment.academicSessionId,
      },
    });
    return assignment;
  }

  async findAll(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.assignmentRepository.findMany(
      query,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
  }

  async findOne(id: string, actor: CurrentUserContext) {
    const item = await this.assignmentRepository.findById(id);
    if (!item) {
      throw new NotFoundException('Batch subject assignment not found');
    }
    if (!actor.roles.includes('SUPER_ADMIN') && item.organizationId !== actor.organizationId) {
      throw new NotFoundException('Batch subject assignment not found');
    }
    return item;
  }

  async update(id: string, payload: UpdateBatchSubjectAssignmentDto, actor: CurrentUserContext) {
    const item = await this.assignmentRepository.update(
      id,
      payload,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'batch-subject-assignments',
      action: 'update',
      targetId: id,
      metadata: {
        batchId: item.batchId,
        subjectId: item.subjectId,
        teacherId: item.teacherId,
        academicSessionId: item.academicSessionId,
      },
    });
    return item;
  }

  async delete(id: string, actor: CurrentUserContext): Promise<void> {
    await this.assignmentRepository.delete(
      id,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'batch-subject-assignments',
      action: 'delete',
      targetId: id,
      metadata: { deleted: true },
    });
  }
}
