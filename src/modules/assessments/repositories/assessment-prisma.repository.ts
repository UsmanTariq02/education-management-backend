import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '.prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { UpdateAssessmentDto } from '../dto/update-assessment.dto';
import {
  AssessmentAnalyticsView,
  AssessmentRepository,
  AssessmentReviewAttemptView,
  AssessmentReviewQueueView,
  AssessmentView,
} from '../interfaces/assessment.repository.interface';

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

const reviewAttemptInclude = {
  student: {
    select: {
      id: true,
      fullName: true,
    },
  },
  answers: {
    include: {
      question: {
        select: {
          id: true,
          prompt: true,
          type: true,
          marks: true,
        },
      },
      selectedOption: {
        select: {
          text: true,
        },
      },
    },
    orderBy: {
      question: {
        orderIndex: 'asc',
      },
    },
  },
  result: true,
  assessment: {
    select: {
      id: true,
      title: true,
      totalMarks: true,
      passMarks: true,
    },
  },
} satisfies Prisma.AssessmentAttemptInclude;

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

  async findReviewQueue(assessmentId: string, organizationId?: string): Promise<AssessmentReviewQueueView | null> {
    const assessment = await this.prisma.assessment.findFirst({
      where: organizationId ? { id: assessmentId, organizationId } : { id: assessmentId },
      select: {
        id: true,
        title: true,
        attempts: {
          include: reviewAttemptInclude,
          orderBy: [{ submittedAt: 'desc' }, { startedAt: 'desc' }],
        },
      },
    });

    if (!assessment) {
      return null;
    }

    const attempts = assessment.attempts.map((attempt) => this.toReviewAttemptView(attempt));

    return {
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      totalAttempts: attempts.length,
      reviewPendingAttempts: attempts.filter((attempt) => attempt.status === 'REVIEW_PENDING').length,
      completedAttempts: attempts.filter((attempt) => attempt.status === 'COMPLETED').length,
      attempts,
    };
  }

  async reviewAttempt(
    attemptId: string,
    payload: {
      answers: Array<{
        answerId: string;
        awardedMarks: number;
        isCorrect?: boolean;
        feedback?: string;
      }>;
      finalize: boolean;
    },
    actorUserId: string,
    organizationId?: string,
  ): Promise<AssessmentReviewAttemptView> {
    const attempt = await this.prisma.assessmentAttempt.findFirstOrThrow({
      where: organizationId
        ? {
            id: attemptId,
            organizationId,
          }
        : { id: attemptId },
      include: reviewAttemptInclude,
    });

    const answerMap = new Map(attempt.answers.map((answer) => [answer.id, answer]));

    const reviewedAttempt = await this.prisma.$transaction(async (tx) => {
      for (const answerInput of payload.answers) {
        const existingAnswer = answerMap.get(answerInput.answerId);
        if (!existingAnswer) {
          throw new NotFoundException('Assessment answer not found');
        }

        await tx.assessmentAnswer.update({
          where: { id: answerInput.answerId },
          data: {
            awardedMarks: answerInput.awardedMarks,
            isCorrect: answerInput.isCorrect ?? existingAnswer.isCorrect,
            feedback: answerInput.feedback,
            reviewedAt: new Date(),
            reviewedByTeacherId: actorUserId,
          },
        });
      }

      const refreshedAttempt = await tx.assessmentAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        include: reviewAttemptInclude,
      });

      const obtainedMarks = refreshedAttempt.answers.reduce((sum, answer) => sum + Number(answer.awardedMarks ?? 0), 0);
      const totalMarks = Number(refreshedAttempt.assessment.totalMarks);
      const percentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : 0;
      const correctResponses = refreshedAttempt.answers.filter((answer) => answer.isCorrect === true).length;
      const attemptedResponses = refreshedAttempt.answers.filter(
        (answer) => Boolean(answer.answerText?.trim()) || Boolean(answer.selectedOptionId),
      ).length;
      const incorrectResponses = refreshedAttempt.answers.filter((answer) => answer.isCorrect === false).length;
      const unansweredCount = Math.max(refreshedAttempt.answers.length - attemptedResponses, 0);

      await tx.assessmentResult.upsert({
        where: { attemptId },
        update: {
          obtainedMarks,
          totalMarks,
          percentage,
          correctAnswers: correctResponses,
          incorrectAnswers: incorrectResponses,
          unansweredCount,
          status: payload.finalize ? 'FINALIZED' : 'PROVISIONAL',
          publishedAt: payload.finalize ? new Date() : null,
        },
        create: {
          organizationId: refreshedAttempt.organizationId,
          assessmentId: refreshedAttempt.assessmentId,
          attemptId: refreshedAttempt.id,
          studentId: refreshedAttempt.studentId,
          obtainedMarks,
          totalMarks,
          percentage,
          correctAnswers: correctResponses,
          incorrectAnswers: incorrectResponses,
          unansweredCount,
          status: payload.finalize ? 'FINALIZED' : 'PROVISIONAL',
          publishedAt: payload.finalize ? new Date() : null,
        },
      });

      await tx.assessmentAttempt.update({
        where: { id: attemptId },
        data: {
          status: payload.finalize ? 'COMPLETED' : 'REVIEW_PENDING',
          requiresManualReview: !payload.finalize,
        },
      });

      return tx.assessmentAttempt.findUniqueOrThrow({
        where: { id: attemptId },
        include: reviewAttemptInclude,
      });
    });

    return this.toReviewAttemptView(reviewedAttempt);
  }

  async findAnalytics(assessmentId: string, organizationId?: string): Promise<AssessmentAnalyticsView | null> {
    const assessment = await this.prisma.assessment.findFirst({
      where: organizationId ? { id: assessmentId, organizationId } : { id: assessmentId },
      include: {
        questions: {
          orderBy: { orderIndex: 'asc' },
          include: {
            answers: true,
          },
        },
        attempts: {
          include: {
            result: true,
          },
        },
      },
    });

    if (!assessment) {
      return null;
    }

    const completedResults = assessment.attempts.map((attempt) => attempt.result).filter((result): result is NonNullable<typeof result> => Boolean(result));
    const totalAttempts = assessment.attempts.length;
    const completedAttempts = completedResults.length;
    const scores = completedResults.map((result) => Number(result.obtainedMarks));
    const percentages = completedResults.map((result) => Number(result.percentage));
    const passMarks = Number(assessment.passMarks);

    return {
      assessmentId: assessment.id,
      assessmentTitle: assessment.title,
      totalAttempts,
      completedAttempts,
      averageScore: scores.length ? Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(2)) : 0,
      averagePercentage: percentages.length
        ? Number((percentages.reduce((sum, value) => sum + value, 0) / percentages.length).toFixed(2))
        : 0,
      passRate: completedResults.length
        ? Number(((completedResults.filter((result) => Number(result.obtainedMarks) >= passMarks).length / completedResults.length) * 100).toFixed(2))
        : 0,
      topScore: scores.length ? Math.max(...scores) : null,
      lowestScore: scores.length ? Math.min(...scores) : null,
      questionBreakdown: assessment.questions.map((question) => {
        const attemptedResponses = question.answers.filter((answer) => Boolean(answer.answerText?.trim()) || Boolean(answer.selectedOptionId));
        const correctResponses = question.answers.filter((answer) => answer.isCorrect === true).length;
        const totalAwardedMarks = question.answers.reduce((sum, answer) => sum + Number(answer.awardedMarks ?? 0), 0);
        return {
          questionId: question.id,
          prompt: question.prompt,
          type: question.type,
          maxMarks: Number(question.marks),
          averageAwardedMarks: question.answers.length ? Number((totalAwardedMarks / question.answers.length).toFixed(2)) : 0,
          correctResponses,
          attemptedResponses: attemptedResponses.length,
          accuracyRate: attemptedResponses.length ? Number(((correctResponses / attemptedResponses.length) * 100).toFixed(2)) : 0,
        };
      }),
    };
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

  private toReviewAttemptView(
    attempt: Prisma.AssessmentAttemptGetPayload<{ include: typeof reviewAttemptInclude }>,
  ): AssessmentReviewAttemptView {
    return {
      attemptId: attempt.id,
      assessmentId: attempt.assessment.id,
      studentId: attempt.student.id,
      studentName: attempt.student.fullName,
      status: attempt.status,
      attemptNumber: attempt.attemptNumber,
      submittedAt: attempt.submittedAt,
      requiresManualReview: attempt.requiresManualReview,
      obtainedMarks: Number(attempt.result?.obtainedMarks ?? 0),
      totalMarks: Number(attempt.result?.totalMarks ?? attempt.assessment.totalMarks),
      percentage: Number(attempt.result?.percentage ?? 0),
      resultStatus: attempt.result?.status ?? 'PROVISIONAL',
      answers: attempt.answers.map((answer) => ({
        id: answer.id,
        questionId: answer.question.id,
        prompt: answer.question.prompt,
        type: answer.question.type,
        maxMarks: Number(answer.question.marks),
        answerText: answer.answerText,
        selectedOptionText: answer.selectedOption?.text ?? null,
        awardedMarks: answer.awardedMarks !== null ? Number(answer.awardedMarks) : null,
        isCorrect: answer.isCorrect,
        feedback: answer.feedback,
        reviewedAt: answer.reviewedAt,
      })),
    };
  }
}
