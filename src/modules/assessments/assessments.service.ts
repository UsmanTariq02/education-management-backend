import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ASSESSMENT_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateAssessmentDto } from './dto/create-assessment.dto';
import { ReviewAssessmentAttemptDto } from './dto/review-assessment-attempt.dto';
import { UpdateAssessmentDto } from './dto/update-assessment.dto';
import { AssessmentRepository } from './interfaces/assessment.repository.interface';

@Injectable()
export class AssessmentsService {
  constructor(
    @Inject(ASSESSMENT_REPOSITORY) private readonly assessmentRepository: AssessmentRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(payload: CreateAssessmentDto, actor: CurrentUserContext) {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }

    const assessment = await this.assessmentRepository.create(payload, actor.organizationId);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'assessments',
      action: 'create',
      targetId: assessment.id,
      metadata: {
        title: assessment.title,
        code: assessment.code,
        type: assessment.type,
        status: assessment.status,
        questionCount: assessment.questionCount,
      },
    });
    return assessment;
  }

  async findAll(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.assessmentRepository.findMany(
      query,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
  }

  async findOne(id: string, actor: CurrentUserContext) {
    const assessment = await this.assessmentRepository.findById(id);
    if (!assessment || (!actor.roles.includes('SUPER_ADMIN') && assessment.organizationId !== actor.organizationId)) {
      throw new NotFoundException('Assessment not found');
    }

    return assessment;
  }

  async update(id: string, payload: UpdateAssessmentDto, actor: CurrentUserContext) {
    const assessment = await this.assessmentRepository.update(
      id,
      payload,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'assessments',
      action: 'update',
      targetId: id,
      metadata: {
        title: assessment.title,
        code: assessment.code,
        type: assessment.type,
        status: assessment.status,
        questionCount: assessment.questionCount,
      },
    });
    return assessment;
  }

  async delete(id: string, actor: CurrentUserContext): Promise<void> {
    await this.assessmentRepository.delete(
      id,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'assessments',
      action: 'delete',
      targetId: id,
      metadata: { deleted: true },
    });
  }

  async findReviewQueue(id: string, actor: CurrentUserContext) {
    const reviewQueue = await this.assessmentRepository.findReviewQueue(
      id,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );

    if (!reviewQueue) {
      throw new NotFoundException('Assessment review queue not found');
    }

    return reviewQueue;
  }

  async reviewAttempt(attemptId: string, payload: ReviewAssessmentAttemptDto, actor: CurrentUserContext) {
    const reviewedAttempt = await this.assessmentRepository.reviewAttempt(
      attemptId,
      payload,
      actor.userId,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'assessments',
      action: payload.finalize ? 'review-finalize' : 'review-save',
      targetId: attemptId,
      metadata: {
        answerCount: payload.answers.length,
        finalize: payload.finalize,
        studentId: reviewedAttempt.studentId,
        assessmentId: reviewedAttempt.assessmentId,
      },
    });

    return reviewedAttempt;
  }

  async findAnalytics(id: string, actor: CurrentUserContext) {
    const analytics = await this.assessmentRepository.findAnalytics(
      id,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );

    if (!analytics) {
      throw new NotFoundException('Assessment analytics not found');
    }

    return analytics;
  }
}
