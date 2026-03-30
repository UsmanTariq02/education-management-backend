import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAssignmentDto } from '../dto/create-assignment.dto';
import { UpdateAssignmentDto } from '../dto/update-assignment.dto';
import { AssignmentRepository, AssignmentSubmissionView, AssignmentView } from '../interfaces/assignment.repository.interface';

const assignmentInclude = {
  organization: { select: { id: true, name: true } },
  academicSession: { select: { id: true, name: true } },
  batch: { select: { id: true, name: true, code: true } },
  subject: { select: { id: true, name: true, code: true } },
  teacher: { select: { id: true, fullName: true } },
  submissions: {
    include: {
      student: { select: { id: true, fullName: true, email: true } },
      reviewedByTeacher: { select: { id: true, fullName: true } },
    },
    orderBy: [{ submittedAt: 'desc' }, { updatedAt: 'desc' }],
  },
} satisfies Prisma.AssignmentInclude;

const submissionInclude = {
  student: { select: { id: true, fullName: true, email: true } },
  reviewedByTeacher: { select: { id: true, fullName: true } },
} satisfies Prisma.AssignmentSubmissionInclude;

@Injectable()
export class AssignmentPrismaRepository implements AssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateAssignmentDto, organizationId: string): Promise<AssignmentView> {
    const isPublished = String(payload.status) === 'PUBLISHED';
    const assignment = await this.prisma.assignment.create({
      data: {
        organizationId,
        academicSessionId: payload.academicSessionId,
        batchId: payload.batchId,
        subjectId: payload.subjectId,
        teacherId: payload.teacherId,
        title: payload.title,
        code: payload.code,
        description: payload.description,
        instructions: payload.instructions,
        status: payload.status,
        maxMarks: payload.maxMarks,
        dueAt: payload.dueAt,
        allowLateSubmission: payload.allowLateSubmission,
        publishedAt: isPublished ? (payload.publishedAt ?? new Date()) : payload.publishedAt,
      },
      include: assignmentInclude,
    });
    return this.toView(assignment);
  }

  async findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<AssignmentView>> {
    const where: Prisma.AssignmentWhereInput = {
      ...(organizationId ? { organizationId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
              { batch: { name: { contains: query.search, mode: 'insensitive' } } },
              { subject: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.assignment.findMany({
        where,
        include: assignmentInclude,
        ...buildPagination(query),
        orderBy: { [query.sortBy ?? 'dueAt']: query.sortOrder },
      }),
      this.prisma.assignment.count({ where }),
    ]);

    return { items: items.map((item) => this.toView(item)), total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<AssignmentView | null> {
    const assignment = await this.prisma.assignment.findUnique({ where: { id }, include: assignmentInclude });
    return assignment ? this.toView(assignment) : null;
  }

  async update(id: string, payload: UpdateAssignmentDto, organizationId?: string): Promise<AssignmentView> {
    if (organizationId) {
      await this.prisma.assignment.findFirstOrThrow({ where: { id, organizationId }, select: { id: true } });
    }

    const isPublished = String(payload.status) === 'PUBLISHED';
    const isDraft = String(payload.status) === 'DRAFT';
    const assignment = await this.prisma.assignment.update({
      where: { id },
      data: {
        academicSessionId: payload.academicSessionId,
        batchId: payload.batchId,
        subjectId: payload.subjectId,
        teacherId: payload.teacherId,
        title: payload.title,
        code: payload.code,
        description: payload.description,
        instructions: payload.instructions,
        status: payload.status,
        maxMarks: payload.maxMarks,
        dueAt: payload.dueAt,
        allowLateSubmission: payload.allowLateSubmission,
        publishedAt: isPublished ? payload.publishedAt ?? new Date() : isDraft ? null : payload.publishedAt,
      },
      include: assignmentInclude,
    });

    return this.toView(assignment);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    if (organizationId) {
      await this.prisma.assignment.findFirstOrThrow({ where: { id, organizationId }, select: { id: true } });
    }

    await this.prisma.assignment.delete({ where: { id } });
  }

  async reviewSubmission(
    submissionId: string,
    payload: { feedback?: string; awardedMarks?: number; finalize: boolean },
    actorUserId: string,
    organizationId?: string,
  ): Promise<AssignmentSubmissionView> {
    const submission = await this.prisma.assignmentSubmission.findFirstOrThrow({
      where: {
        id: submissionId,
        ...(organizationId ? { organizationId } : {}),
      },
      include: {
        assignment: { select: { maxMarks: true } },
      },
    });

    const awardedMarks =
      payload.awardedMarks === undefined ? submission.awardedMarks : Math.min(payload.awardedMarks, Number(submission.assignment.maxMarks));

    const updated = await this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        feedback: payload.feedback ?? submission.feedback,
        awardedMarks,
        reviewedAt: payload.finalize ? new Date() : submission.reviewedAt ?? new Date(),
        reviewedByTeacherId: actorUserId,
        status: payload.finalize ? 'REVIEWED' : submission.status === 'DRAFT' ? 'SUBMITTED' : submission.status,
      },
      include: submissionInclude,
    });

    return this.toSubmissionView(updated);
  }

  private toView(assignment: Prisma.AssignmentGetPayload<{ include: typeof assignmentInclude }>): AssignmentView {
    return {
      id: assignment.id,
      organizationId: assignment.organization.id,
      organizationName: assignment.organization.name,
      academicSessionId: assignment.academicSession?.id ?? null,
      academicSessionName: assignment.academicSession?.name ?? null,
      batchId: assignment.batch.id,
      batchName: assignment.batch.name,
      batchCode: assignment.batch.code,
      subjectId: assignment.subject.id,
      subjectName: assignment.subject.name,
      subjectCode: assignment.subject.code,
      teacherId: assignment.teacher?.id ?? null,
      teacherName: assignment.teacher?.fullName ?? null,
      title: assignment.title,
      code: assignment.code,
      description: assignment.description,
      instructions: assignment.instructions,
      status: assignment.status,
      maxMarks: Number(assignment.maxMarks),
      dueAt: assignment.dueAt,
      allowLateSubmission: assignment.allowLateSubmission,
      publishedAt: assignment.publishedAt,
      submissionCount: assignment.submissions.length,
      reviewedCount: assignment.submissions.filter((submission) => submission.status === 'REVIEWED').length,
      submissions: assignment.submissions.map((submission) => this.toSubmissionView(submission)),
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
    };
  }

  private toSubmissionView(
    submission: Prisma.AssignmentSubmissionGetPayload<{ include: typeof submissionInclude }>,
  ): AssignmentSubmissionView {
    return {
      id: submission.id,
      studentId: submission.student.id,
      studentName: submission.student.fullName,
      studentEmail: submission.student.email,
      status: submission.status,
      submissionText: submission.submissionText,
      attachmentLinks: submission.attachmentLinks,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt,
      feedback: submission.feedback,
      awardedMarks: submission.awardedMarks !== null ? Number(submission.awardedMarks) : null,
      reviewedByTeacherId: submission.reviewedByTeacher?.id ?? null,
      reviewedByTeacherName: submission.reviewedByTeacher?.fullName ?? null,
    };
  }
}
