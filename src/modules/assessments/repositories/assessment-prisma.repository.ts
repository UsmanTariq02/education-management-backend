import { Injectable } from '@nestjs/common';
import { Prisma } from '.prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { UpdateAssessmentDto } from '../dto/update-assessment.dto';
import { AssessmentRepository, AssessmentView } from '../interfaces/assessment.repository.interface';

const assessmentInclude = {
  organization: { select: { id: true, name: true } },
  academicSession: { select: { id: true, name: true } },
  batch: { select: { id: true, name: true, code: true } },
  subject: { select: { id: true, name: true, code: true } },
  teacher: { select: { id: true, fullName: true } },
  questions: {
    include: {
      options: {
        orderBy: { orderIndex: 'asc' },
      },
    },
    orderBy: { orderIndex: 'asc' },
  },
} satisfies Prisma.AssessmentInclude;

@Injectable()
export class AssessmentPrismaRepository implements AssessmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateAssessmentDto, organizationId: string): Promise<AssessmentView> {
    const totalMarks = payload.questions.reduce((sum, question) => sum + Number(question.marks ?? 0), 0);
    const assessment = await this.prisma.assessment.create({
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
        type: payload.type,
        status: payload.status,
        durationMinutes: payload.durationMinutes,
        totalMarks,
        passMarks: payload.passMarks,
        startsAt: payload.startsAt,
        endsAt: payload.endsAt,
        availableFrom: payload.availableFrom,
        availableUntil: payload.availableUntil,
        shuffleQuestions: payload.shuffleQuestions,
        shuffleOptions: payload.shuffleOptions,
        showResultImmediately: payload.showResultImmediately,
        allowMultipleAttempts: payload.allowMultipleAttempts,
        maxAttempts: payload.allowMultipleAttempts ? payload.maxAttempts : 1,
        negativeMarkingEnabled: payload.negativeMarkingEnabled,
        negativeMarkingPerWrong: payload.negativeMarkingEnabled ? payload.negativeMarkingPerWrong : null,
        questions: {
          create: payload.questions.map((question, index) => ({
            organizationId,
            subjectId: payload.subjectId,
            prompt: question.prompt,
            helperText: question.helperText,
            type: question.type,
            orderIndex: index + 1,
            marks: question.marks,
            explanation: question.explanation,
            acceptedAnswers: question.acceptedAnswers ?? [],
            correctBooleanAnswer: question.correctBooleanAnswer,
            options: {
              create: (question.options ?? []).map((option, optionIndex) => ({
                text: option.text,
                orderIndex: optionIndex + 1,
                isCorrect: option.isCorrect,
              })),
            },
          })),
        },
      },
      include: assessmentInclude,
    });
    return this.toView(assessment);
  }

  async findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<AssessmentView>> {
    const where: Prisma.AssessmentWhereInput = {
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
      this.prisma.assessment.findMany({
        where,
        include: assessmentInclude,
        ...buildPagination(query),
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
      }),
      this.prisma.assessment.count({ where }),
    ]);

    return { items: items.map((item) => this.toView(item)), total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<AssessmentView | null> {
    const assessment = await this.prisma.assessment.findUnique({
      where: { id },
      include: assessmentInclude,
    });
    return assessment ? this.toView(assessment) : null;
  }

  async update(id: string, payload: UpdateAssessmentDto, organizationId?: string): Promise<AssessmentView> {
    const existing = await this.prisma.assessment.findFirstOrThrow({
      where: organizationId ? { id, organizationId } : { id },
      select: { id: true, organizationId: true, subjectId: true },
    });

    const assessment = await this.prisma.$transaction(async (tx) => {
      if (payload.questions) {
        await tx.assessmentQuestion.deleteMany({ where: { assessmentId: id } });
      }

      const totalMarks = payload.questions
        ? payload.questions.reduce((sum, question) => sum + Number(question.marks ?? 0), 0)
        : undefined;

      return tx.assessment.update({
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
          type: payload.type,
          status: payload.status,
          durationMinutes: payload.durationMinutes,
          totalMarks,
          passMarks: payload.passMarks,
          startsAt: payload.startsAt,
          endsAt: payload.endsAt,
          availableFrom: payload.availableFrom,
          availableUntil: payload.availableUntil,
          shuffleQuestions: payload.shuffleQuestions,
          shuffleOptions: payload.shuffleOptions,
          showResultImmediately: payload.showResultImmediately,
          allowMultipleAttempts: payload.allowMultipleAttempts,
          maxAttempts: payload.allowMultipleAttempts === false ? 1 : payload.maxAttempts,
          negativeMarkingEnabled: payload.negativeMarkingEnabled,
          negativeMarkingPerWrong: payload.negativeMarkingEnabled ? payload.negativeMarkingPerWrong : null,
          ...(payload.questions
            ? {
                questions: {
                  create: payload.questions.map((question, index) => ({
                    organizationId: existing.organizationId,
                    subjectId: payload.subjectId ?? existing.subjectId,
                    prompt: question.prompt,
                    helperText: question.helperText,
                    type: question.type,
                    orderIndex: index + 1,
                    marks: question.marks,
                    explanation: question.explanation,
                    acceptedAnswers: question.acceptedAnswers ?? [],
                    correctBooleanAnswer: question.correctBooleanAnswer,
                    options: {
                      create: (question.options ?? []).map((option, optionIndex) => ({
                        text: option.text,
                        orderIndex: optionIndex + 1,
                        isCorrect: option.isCorrect,
                      })),
                    },
                  })),
                },
              }
            : {}),
        },
        include: assessmentInclude,
      });
    });

    return this.toView(assessment);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    if (organizationId) {
      await this.prisma.assessment.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }

    await this.prisma.assessment.delete({ where: { id } });
  }

  private toView(assessment: Prisma.AssessmentGetPayload<{ include: typeof assessmentInclude }>): AssessmentView {
    return {
      id: assessment.id,
      organizationId: assessment.organization.id,
      organizationName: assessment.organization.name,
      academicSessionId: assessment.academicSession?.id ?? null,
      academicSessionName: assessment.academicSession?.name ?? null,
      batchId: assessment.batch.id,
      batchName: assessment.batch.name,
      batchCode: assessment.batch.code,
      subjectId: assessment.subject.id,
      subjectName: assessment.subject.name,
      subjectCode: assessment.subject.code,
      teacherId: assessment.teacher?.id ?? null,
      teacherName: assessment.teacher?.fullName ?? null,
      title: assessment.title,
      code: assessment.code,
      description: assessment.description,
      instructions: assessment.instructions,
      type: assessment.type,
      status: assessment.status,
      durationMinutes: assessment.durationMinutes,
      totalMarks: Number(assessment.totalMarks),
      passMarks: Number(assessment.passMarks),
      startsAt: assessment.startsAt,
      endsAt: assessment.endsAt,
      availableFrom: assessment.availableFrom,
      availableUntil: assessment.availableUntil,
      shuffleQuestions: assessment.shuffleQuestions,
      shuffleOptions: assessment.shuffleOptions,
      showResultImmediately: assessment.showResultImmediately,
      allowMultipleAttempts: assessment.allowMultipleAttempts,
      maxAttempts: assessment.maxAttempts,
      negativeMarkingEnabled: assessment.negativeMarkingEnabled,
      negativeMarkingPerWrong: assessment.negativeMarkingPerWrong ? Number(assessment.negativeMarkingPerWrong) : null,
      questionCount: assessment.questions.length,
      questions: assessment.questions.map((question) => ({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        helperText: question.helperText,
        explanation: question.explanation,
        orderIndex: question.orderIndex,
        marks: Number(question.marks),
        acceptedAnswers: question.acceptedAnswers,
        correctBooleanAnswer: question.correctBooleanAnswer,
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
          orderIndex: option.orderIndex,
          isCorrect: option.isCorrect,
        })),
      })),
      createdAt: assessment.createdAt,
      updatedAt: assessment.updatedAt,
    };
  }
}
