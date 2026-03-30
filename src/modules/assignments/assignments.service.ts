import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ASSIGNMENT_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { ReviewAssignmentSubmissionDto } from './dto/review-assignment-submission.dto';
import { UpdateAssignmentDto } from './dto/update-assignment.dto';
import { AssignmentRepository } from './interfaces/assignment.repository.interface';

@Injectable()
export class AssignmentsService {
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY) private readonly assignmentRepository: AssignmentRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(payload: CreateAssignmentDto, actor: CurrentUserContext) {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }

    const assignment = await this.assignmentRepository.create(payload, actor.organizationId);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'assignments',
      action: 'create',
      targetId: assignment.id,
      metadata: { title: assignment.title, code: assignment.code, status: assignment.status },
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
    const assignment = await this.assignmentRepository.findById(id);
    if (!assignment || (!actor.roles.includes('SUPER_ADMIN') && assignment.organizationId !== actor.organizationId)) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

  async update(id: string, payload: UpdateAssignmentDto, actor: CurrentUserContext) {
    const assignment = await this.assignmentRepository.update(
      id,
      payload,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'assignments',
      action: 'update',
      targetId: id,
      metadata: { title: assignment.title, code: assignment.code, status: assignment.status },
    });
    return assignment;
  }

  async reviewSubmission(id: string, payload: ReviewAssignmentSubmissionDto, actor: CurrentUserContext) {
    const submission = await this.assignmentRepository.reviewSubmission(
      id,
      payload,
      actor.userId,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'assignments',
      action: payload.finalize ? 'review-finalize' : 'review-save',
      targetId: id,
      metadata: { studentId: submission.studentId, status: submission.status, awardedMarks: submission.awardedMarks },
    });

    return submission;
  }

  async delete(id: string, actor: CurrentUserContext): Promise<void> {
    await this.assignmentRepository.delete(
      id,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'assignments',
      action: 'delete',
      targetId: id,
      metadata: { deleted: true },
    });
  }
}
