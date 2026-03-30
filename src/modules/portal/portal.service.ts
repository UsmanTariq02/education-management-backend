import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentPortalUserContext } from '../../common/interfaces/current-portal-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import {
  PortalAssessmentDetailDto,
  PortalAssessmentListItemDto,
  PortalAssessmentSubmitResultDto,
  PortalAssessmentAttemptDto,
  SavePortalAssessmentAttemptDto,
} from './dto/portal-assessments.dto';
import { PortalAssignmentDetailDto, PortalAssignmentListItemDto, PortalAssignmentSubmissionDto } from './dto/portal-assignments.dto';
import { PortalDashboardDto } from './dto/portal-dashboard.dto';
import { UpsertPortalAssignmentSubmissionDto } from '../assignments/dto/create-assignment.dto';

@Injectable()
export class PortalService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard(actor: CurrentPortalUserContext): Promise<PortalDashboardDto> {
    const student = await this.prisma.student.findFirst({
      where: {
        id: actor.studentId,
        organizationId: actor.organizationId,
      },
      include: {
        organization: {
          select: {
            name: true,
            enabledModules: true,
          },
        },
        studentBatches: {
          include: {
            batch: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Portal student context not found');
    }

    if (!(student.organization.enabledModules as string[]).includes(OrganizationModule.PORTALS)) {
      throw new UnauthorizedException('Portal access is not enabled for this organization');
    }

    const batchIds = student.studentBatches.map((item) => item.batchId);

    const [feeRecords, attendanceRecords, reminderLogs, examResults, timetableEntries, publishedAssessments, recentAssessmentAttempts] = await Promise.all([
      this.prisma.feeRecord.findMany({
        where: { organizationId: actor.organizationId, studentId: actor.studentId },
        orderBy: [{ year: 'desc' }, { month: 'desc' }, { createdAt: 'desc' }],
        take: 12,
      }),
      this.prisma.attendance.findMany({
        where: { organizationId: actor.organizationId, studentId: actor.studentId },
        include: { batch: { select: { name: true } } },
        orderBy: { attendanceDate: 'desc' },
        take: 30,
      }),
      this.prisma.reminderLog.findMany({
        where: { organizationId: actor.organizationId, studentId: actor.studentId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.studentExamResult.findMany({
        where: {
          organizationId: actor.organizationId,
          studentId: actor.studentId,
          status: 'PUBLISHED',
        },
        include: {
          exam: { select: { name: true } },
          batch: { select: { name: true } },
          resultItems: {
            include: {
              subject: { select: { name: true } },
              examSubject: { select: { totalMarks: true } },
            },
          },
        },
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: 6,
      }),
      this.prisma.timetableEntry.findMany({
        where: {
          organizationId: actor.organizationId,
          batchId: { in: batchIds.length ? batchIds : ['00000000-0000-0000-0000-000000000000'] },
          isActive: true,
        },
        include: {
          batch: { select: { name: true } },
          subject: { select: { name: true } },
          teacher: { select: { fullName: true } },
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        take: 20,
      }),
      this.prisma.assessment.findMany({
        where: {
          organizationId: actor.organizationId,
          batchId: { in: batchIds.length ? batchIds : ['00000000-0000-0000-0000-000000000000'] },
          status: 'PUBLISHED',
        },
        include: {
          subject: { select: { name: true } },
          attempts: {
            where: { studentId: actor.studentId },
            include: { result: true },
            orderBy: [{ attemptNumber: 'desc' }],
            take: 1,
          },
        },
        orderBy: [{ availableUntil: 'asc' }, { createdAt: 'desc' }],
        take: 6,
      }),
      this.prisma.assessmentAttempt.findMany({
        where: {
          organizationId: actor.organizationId,
          studentId: actor.studentId,
        },
        include: {
          assessment: {
            select: {
              id: true,
              title: true,
              subject: { select: { name: true } },
            },
          },
          result: true,
        },
        orderBy: [{ updatedAt: 'desc' }],
        take: 6,
      }),
    ]);

    const totalDue = feeRecords.reduce((sum, item) => sum + Number(item.amountDue), 0);
    const totalPaid = feeRecords.reduce((sum, item) => sum + Number(item.amountPaid), 0);
    const pendingAmount = Math.max(totalDue - totalPaid, 0);
    const overdueCount = feeRecords.filter((item) => item.status === 'OVERDUE').length;

    const attendanceBreakdown = (['PRESENT', 'ABSENT', 'LATE', 'LEAVE'] as const).map((status) => ({
      status,
      total: attendanceRecords.filter((record) => record.status === status).length,
    }));
    const presentCount = attendanceRecords.filter((record) => record.status === AttendanceStatus.PRESENT).length;
    const attendanceRate = attendanceRecords.length
      ? Number(((presentCount / attendanceRecords.length) * 100).toFixed(1))
      : 0;

    const latestPublished = examResults[0] ?? null;

    return {
      accountType: actor.accountType,
      student: {
        id: student.id,
        fullName: student.fullName,
        guardianName: student.guardianName,
        email: student.email,
        guardianEmail: student.guardianEmail,
        phone: student.phone,
        guardianPhone: student.guardianPhone,
        status: student.status,
        organizationName: student.organization.name,
        batches: student.studentBatches.map((item) => ({
          id: item.batch.id,
          name: item.batch.name,
          code: item.batch.code,
        })),
      },
      feeSummary: {
        totalDue,
        totalPaid,
        pendingAmount,
        overdueCount,
        recentRecords: feeRecords.map((item) => ({
          id: item.id,
          month: item.month,
          year: item.year,
          amountDue: Number(item.amountDue),
          amountPaid: Number(item.amountPaid),
          status: item.status,
          paidAt: item.paidAt,
        })),
      },
      attendanceSummary: {
        totalEntries: attendanceRecords.length,
        attendanceRate,
        breakdown: attendanceBreakdown,
        recentRecords: attendanceRecords.map((item) => ({
          id: item.id,
          attendanceDate: item.attendanceDate,
          status: item.status,
          notes: item.remarks,
          batchName: item.batch.name,
        })),
      },
      reminderSummary: {
        total: reminderLogs.length,
        sent: reminderLogs.filter((item) => item.status === 'SENT').length,
        failed: reminderLogs.filter((item) => item.status === 'FAILED').length,
        recentRecords: reminderLogs.map((item) => ({
          id: item.id,
          channel: item.channel,
          status: item.status,
          createdAt: item.createdAt,
          message: item.message,
        })),
      },
      academicSummary: {
        publishedResults: examResults.length,
        latestPercentage: latestPublished ? Number(latestPublished.percentage) : null,
        latestGrade: latestPublished?.grade ?? null,
        recentResults: examResults.map((item) => ({
          id: item.id,
          examName: item.exam.name,
          batchName: item.batch.name,
          percentage: Number(item.percentage),
          grade: item.grade,
          publishedAt: item.publishedAt,
          items: item.resultItems.map((resultItem) => ({
            subjectName: resultItem.subject.name,
            obtainedMarks: Number(resultItem.obtainedMarks),
            totalMarks: Number(resultItem.examSubject.totalMarks),
            grade: resultItem.grade,
          })),
        })),
        timetable: timetableEntries.map((item) => ({
          id: item.id,
          dayOfWeek: item.dayOfWeek,
          startTime: item.startTime,
          endTime: item.endTime,
          subjectName: item.subject.name,
          teacherName: item.teacher?.fullName ?? null,
          room: item.room,
          batchName: item.batch.name,
        })),
        assessmentSummary: {
          availableCount: publishedAssessments.length,
          inProgressCount: recentAssessmentAttempts.filter((item) => item.status === 'IN_PROGRESS').length,
          completedCount: recentAssessmentAttempts.filter((item) => ['AUTO_GRADED', 'REVIEW_PENDING', 'COMPLETED'].includes(item.status)).length,
          upcoming: publishedAssessments.map((item) => ({
            id: item.id,
            title: item.title,
            subjectName: item.subject.name,
            type: item.type,
            availableUntil: item.availableUntil,
            durationMinutes: item.durationMinutes,
          })),
          recentAttempts: recentAssessmentAttempts.map((item) => ({
            attemptId: item.id,
            assessmentId: item.assessment.id,
            title: item.assessment.title,
            subjectName: item.assessment.subject.name,
            status: item.status,
            percentage: item.result ? Number(item.result.percentage) : null,
            submittedAt: item.submittedAt,
          })),
        },
      },
    };
  }

  async getAssessments(actor: CurrentPortalUserContext): Promise<PortalAssessmentListItemDto[]> {
    const batchIds = await this.getStudentBatchIds(actor);
    const assessments = await this.prisma.assessment.findMany({
      where: {
        organizationId: actor.organizationId,
        batchId: { in: batchIds.length ? batchIds : ['00000000-0000-0000-0000-000000000000'] },
        status: 'PUBLISHED',
      },
      include: {
        subject: { select: { name: true } },
        batch: { select: { name: true } },
        questions: { select: { id: true } },
        attempts: {
          where: { studentId: actor.studentId },
          include: { result: true },
          orderBy: [{ attemptNumber: 'desc' }],
          take: 1,
        },
      },
      orderBy: [{ availableFrom: 'asc' }, { createdAt: 'desc' }],
    });

    return assessments.map((assessment) => {
      const latestAttempt = assessment.attempts[0] ?? null;
      return {
        id: assessment.id,
        title: assessment.title,
        code: assessment.code,
        subjectName: assessment.subject.name,
        batchName: assessment.batch.name,
        type: assessment.type,
        durationMinutes: assessment.durationMinutes,
        totalMarks: Number(assessment.totalMarks),
        passMarks: Number(assessment.passMarks),
        startsAt: assessment.startsAt,
        endsAt: assessment.endsAt,
        availableFrom: assessment.availableFrom,
        availableUntil: assessment.availableUntil,
        showResultImmediately: assessment.showResultImmediately,
        questionCount: assessment.questions.length,
        latestAttempt: latestAttempt
          ? {
              id: latestAttempt.id,
              status: latestAttempt.status,
              attemptNumber: latestAttempt.attemptNumber,
              submittedAt: latestAttempt.submittedAt,
              resultStatus: latestAttempt.result?.status ?? null,
              percentage: latestAttempt.result ? Number(latestAttempt.result.percentage) : null,
            }
          : null,
      };
    });
  }

  async getAssignments(actor: CurrentPortalUserContext): Promise<PortalAssignmentListItemDto[]> {
    const batchIds = await this.getStudentBatchIds(actor);
    const assignments = await this.prisma.assignment.findMany({
      where: {
        organizationId: actor.organizationId,
        batchId: { in: batchIds.length ? batchIds : ['00000000-0000-0000-0000-000000000000'] },
        status: 'PUBLISHED',
      },
      include: {
        subject: { select: { name: true } },
        batch: { select: { name: true } },
        teacher: { select: { fullName: true } },
        submissions: {
          where: { studentId: actor.studentId },
          include: { reviewedByTeacher: { select: { fullName: true } } },
          take: 1,
        },
      },
      orderBy: [{ dueAt: 'asc' }, { createdAt: 'desc' }],
    });

    return assignments.map((assignment) => ({
      id: assignment.id,
      title: assignment.title,
      code: assignment.code,
      subjectName: assignment.subject.name,
      batchName: assignment.batch.name,
      teacherName: assignment.teacher?.fullName ?? null,
      maxMarks: Number(assignment.maxMarks),
      dueAt: assignment.dueAt,
      status: assignment.status,
      allowLateSubmission: assignment.allowLateSubmission,
      submission: assignment.submissions[0] ? this.mapAssignmentSubmission(assignment.submissions[0]) : null,
    }));
  }

  async getAssignmentDetail(assignmentId: string, actor: CurrentPortalUserContext): Promise<PortalAssignmentDetailDto> {
    const assignment = await this.getPortalAssignmentOrThrow(assignmentId, actor);
    return {
      id: assignment.id,
      title: assignment.title,
      code: assignment.code,
      description: assignment.description,
      instructions: assignment.instructions,
      subjectName: assignment.subject.name,
      batchName: assignment.batch.name,
      teacherName: assignment.teacher?.fullName ?? null,
      maxMarks: Number(assignment.maxMarks),
      dueAt: assignment.dueAt,
      status: assignment.status,
      allowLateSubmission: assignment.allowLateSubmission,
      canSubmit: this.canSubmitAssignment(assignment),
      submission: assignment.submissions[0] ? this.mapAssignmentSubmission(assignment.submissions[0]) : null,
    };
  }

  async saveAssignmentSubmission(
    assignmentId: string,
    payload: UpsertPortalAssignmentSubmissionDto,
    actor: CurrentPortalUserContext,
  ): Promise<PortalAssignmentSubmissionDto> {
    this.ensureStudentPortalActor(actor);
    const assignment = await this.getPortalAssignmentOrThrow(assignmentId, actor);
    if (!this.canSubmitAssignment(assignment)) {
      throw new UnauthorizedException('Assignment can no longer be submitted');
    }

    const submission = await this.prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: actor.studentId,
        },
      },
      update: {
        submissionText: payload.submissionText?.trim() ? payload.submissionText.trim() : null,
        attachmentLinks: payload.attachmentLinks ?? [],
        status: 'DRAFT',
        submittedAt: null,
      },
      create: {
        organizationId: actor.organizationId,
        assignmentId: assignment.id,
        studentId: actor.studentId,
        submissionText: payload.submissionText?.trim() ? payload.submissionText.trim() : null,
        attachmentLinks: payload.attachmentLinks ?? [],
        status: 'DRAFT',
      },
      include: {
        reviewedByTeacher: { select: { fullName: true } },
      },
    });

    return this.mapAssignmentSubmission(submission);
  }

  async submitAssignment(
    assignmentId: string,
    payload: UpsertPortalAssignmentSubmissionDto,
    actor: CurrentPortalUserContext,
  ): Promise<PortalAssignmentSubmissionDto> {
    this.ensureStudentPortalActor(actor);
    const assignment = await this.getPortalAssignmentOrThrow(assignmentId, actor);
    if (!this.canSubmitAssignment(assignment)) {
      throw new UnauthorizedException('Assignment can no longer be submitted');
    }

    const submission = await this.prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: actor.studentId,
        },
      },
      update: {
        submissionText: payload.submissionText?.trim() ? payload.submissionText.trim() : null,
        attachmentLinks: payload.attachmentLinks ?? [],
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      create: {
        organizationId: actor.organizationId,
        assignmentId: assignment.id,
        studentId: actor.studentId,
        submissionText: payload.submissionText?.trim() ? payload.submissionText.trim() : null,
        attachmentLinks: payload.attachmentLinks ?? [],
        status: 'SUBMITTED',
        submittedAt: new Date(),
      },
      include: {
        reviewedByTeacher: { select: { fullName: true } },
      },
    });

    return this.mapAssignmentSubmission(submission);
  }

  async getAssessmentDetail(assessmentId: string, actor: CurrentPortalUserContext): Promise<PortalAssessmentDetailDto> {
    const assessment = await this.getPortalAssessmentOrThrow(assessmentId, actor);
    const activeAttempt = assessment.attempts.find((attempt) => attempt.status === 'IN_PROGRESS') ?? assessment.attempts[0] ?? null;

    return {
      id: assessment.id,
      title: assessment.title,
      code: assessment.code,
      description: assessment.description,
      instructions: assessment.instructions,
      subjectName: assessment.subject.name,
      batchName: assessment.batch.name,
      type: assessment.type,
      durationMinutes: assessment.durationMinutes,
      totalMarks: Number(assessment.totalMarks),
      passMarks: Number(assessment.passMarks),
      startsAt: assessment.startsAt,
      endsAt: assessment.endsAt,
      availableFrom: assessment.availableFrom,
      availableUntil: assessment.availableUntil,
      showResultImmediately: assessment.showResultImmediately,
      allowMultipleAttempts: assessment.allowMultipleAttempts,
      maxAttempts: assessment.maxAttempts,
      questionCount: assessment.questions.length,
      questions: assessment.questions.map((question) => ({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        helperText: question.helperText,
        orderIndex: question.orderIndex,
        marks: Number(question.marks),
        options: question.options.map((option) => ({
          id: option.id,
          text: option.text,
          orderIndex: option.orderIndex,
        })),
      })),
      activeAttempt: activeAttempt ? this.mapAttempt(activeAttempt) : null,
    };
  }

  async startAssessment(assessmentId: string, actor: CurrentPortalUserContext): Promise<PortalAssessmentAttemptDto> {
    this.ensureStudentPortalActor(actor);
    const assessment = await this.getPortalAssessmentOrThrow(assessmentId, actor);
    this.assertAssessmentAvailable(assessment);

    const existingInProgress = assessment.attempts.find((attempt) => attempt.status === 'IN_PROGRESS');
    if (existingInProgress) {
      return this.mapAttempt(existingInProgress);
    }

    const completedAttempts = assessment.attempts.filter((attempt) => attempt.status !== 'IN_PROGRESS');
    if (!assessment.allowMultipleAttempts && completedAttempts.length) {
      throw new UnauthorizedException('This assessment has already been attempted');
    }
    if (assessment.allowMultipleAttempts && completedAttempts.length >= assessment.maxAttempts) {
      throw new UnauthorizedException('Maximum attempts reached for this assessment');
    }

    const attempt = await this.prisma.assessmentAttempt.create({
      data: {
        organizationId: actor.organizationId,
        assessmentId: assessment.id,
        studentId: actor.studentId,
        attemptNumber: completedAttempts.length + 1,
      },
      include: {
        answers: true,
        result: true,
      },
    });

    return this.mapAttempt(attempt);
  }

  async saveAssessmentAnswers(
    attemptId: string,
    payload: SavePortalAssessmentAttemptDto,
    actor: CurrentPortalUserContext,
  ): Promise<PortalAssessmentAttemptDto> {
    this.ensureStudentPortalActor(actor);
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        organizationId: actor.organizationId,
        studentId: actor.studentId,
      },
      include: {
        assessment: {
          include: {
            questions: {
              include: { options: true },
            },
          },
        },
        answers: true,
        result: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException('Assessment attempt not found');
    }
    if (attempt.status !== 'IN_PROGRESS') {
      throw new UnauthorizedException('Only in-progress attempts can be updated');
    }

    const questionMap = new Map(attempt.assessment.questions.map((question) => [question.id, question]));

    await this.prisma.$transaction(
      payload.answers.map((answer) => {
        const question = questionMap.get(answer.questionId);
        if (!question) {
          throw new NotFoundException('Assessment question not found');
        }
        if (answer.selectedOptionId && !question.options.some((option) => option.id === answer.selectedOptionId)) {
          throw new UnauthorizedException('Selected option does not belong to the question');
        }

        return this.prisma.assessmentAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId: attempt.id,
              questionId: question.id,
            },
          },
          update: {
            selectedOptionId: answer.selectedOptionId ?? null,
            answerText: answer.answerText?.trim() ? answer.answerText.trim() : null,
            isCorrect: null,
            awardedMarks: null,
            isAutoGraded: false,
            feedback: null,
            reviewedAt: null,
            reviewedByTeacherId: null,
          },
          create: {
            organizationId: actor.organizationId,
            attemptId: attempt.id,
            questionId: question.id,
            selectedOptionId: answer.selectedOptionId ?? null,
            answerText: answer.answerText?.trim() ? answer.answerText.trim() : null,
          },
        });
      }),
    );

    const refreshedAttempt = await this.prisma.assessmentAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
      include: {
        answers: true,
        result: true,
      },
    });

    return this.mapAttempt(refreshedAttempt);
  }

  async submitAssessment(attemptId: string, actor: CurrentPortalUserContext): Promise<PortalAssessmentSubmitResultDto> {
    this.ensureStudentPortalActor(actor);
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: {
        id: attemptId,
        organizationId: actor.organizationId,
        studentId: actor.studentId,
      },
      include: {
        assessment: {
          include: {
            questions: {
              include: { options: true },
              orderBy: { orderIndex: 'asc' },
            },
          },
        },
        answers: true,
        result: true,
      },
    });

    if (!attempt) {
      throw new NotFoundException('Assessment attempt not found');
    }
    if (attempt.status !== 'IN_PROGRESS') {
      throw new UnauthorizedException('Assessment attempt has already been submitted');
    }

    const answerMap = new Map(attempt.answers.map((answer) => [answer.questionId, answer]));
    let obtainedMarks = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let unansweredCount = 0;
    let requiresManualReview = false;

    const gradingUpdates = attempt.assessment.questions.map((question) => {
      const existingAnswer = answerMap.get(question.id);
      const normalizedText = existingAnswer?.answerText?.trim().toLowerCase() ?? '';
      const questionMarks = Number(question.marks);

      if (!existingAnswer || (!existingAnswer.selectedOptionId && !normalizedText)) {
        unansweredCount += 1;
        return null;
      }

      if (question.type === 'SHORT_ANSWER' || question.type === 'LONG_ANSWER') {
        requiresManualReview = true;
        return this.prisma.assessmentAnswer.update({
          where: { id: existingAnswer.id },
          data: {
            isAutoGraded: false,
            isCorrect: null,
            awardedMarks: null,
          },
        });
      }

      let isCorrect = false;
      if (question.type === 'MCQ') {
        const selectedOption = question.options.find((option) => option.id === existingAnswer.selectedOptionId);
        isCorrect = Boolean(selectedOption?.isCorrect);
      } else if (question.type === 'TRUE_FALSE') {
        isCorrect = String(question.correctBooleanAnswer) === normalizedText;
      } else if (question.type === 'FILL_IN_THE_BLANK') {
        isCorrect = question.acceptedAnswers.some((answer) => answer.trim().toLowerCase() === normalizedText);
      }

      const awardedMarks = isCorrect
        ? questionMarks
        : attempt.assessment.negativeMarkingEnabled
          ? Math.max(0 - Number(attempt.assessment.negativeMarkingPerWrong ?? 0), -questionMarks)
          : 0;

      if (isCorrect) {
        correctAnswers += 1;
      } else {
        incorrectAnswers += 1;
      }
      obtainedMarks += awardedMarks;

      return this.prisma.assessmentAnswer.update({
        where: { id: existingAnswer.id },
        data: {
          isAutoGraded: true,
          isCorrect,
          awardedMarks,
        },
      });
    });

    const totalMarks = Number(attempt.assessment.totalMarks);
    const percentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : 0;
    const resultStatus = requiresManualReview ? 'PROVISIONAL' : 'FINALIZED';

    await this.prisma.$transaction([
      ...gradingUpdates.filter((update): update is NonNullable<typeof update> => Boolean(update)),
      this.prisma.assessmentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: requiresManualReview ? 'REVIEW_PENDING' : 'COMPLETED',
          submittedAt: new Date(),
          autoGradedAt: new Date(),
          requiresManualReview,
        },
      }),
      this.prisma.assessmentResult.upsert({
        where: { attemptId: attempt.id },
        update: {
          obtainedMarks,
          totalMarks,
          percentage,
          correctAnswers,
          incorrectAnswers,
          unansweredCount,
          status: resultStatus,
          publishedAt: attempt.assessment.showResultImmediately ? new Date() : null,
        },
        create: {
          organizationId: actor.organizationId,
          assessmentId: attempt.assessment.id,
          attemptId: attempt.id,
          studentId: actor.studentId,
          obtainedMarks,
          totalMarks,
          percentage,
          correctAnswers,
          incorrectAnswers,
          unansweredCount,
          status: resultStatus,
          publishedAt: attempt.assessment.showResultImmediately ? new Date() : null,
        },
      }),
    ]);

    const submittedAttempt = await this.prisma.assessmentAttempt.findUniqueOrThrow({
      where: { id: attempt.id },
      include: {
        answers: true,
        result: true,
      },
    });

    return {
      attemptId: submittedAttempt.id,
      status: submittedAttempt.result?.status ?? 'PROVISIONAL',
      requiresManualReview: submittedAttempt.requiresManualReview,
      obtainedMarks: submittedAttempt.result ? Number(submittedAttempt.result.obtainedMarks) : 0,
      totalMarks: submittedAttempt.result ? Number(submittedAttempt.result.totalMarks) : totalMarks,
      percentage: submittedAttempt.result ? Number(submittedAttempt.result.percentage) : percentage,
      correctAnswers: submittedAttempt.result?.correctAnswers ?? correctAnswers,
      incorrectAnswers: submittedAttempt.result?.incorrectAnswers ?? incorrectAnswers,
      unansweredCount: submittedAttempt.result?.unansweredCount ?? unansweredCount,
      answers: submittedAttempt.answers.map((answer) => ({
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        answerText: answer.answerText,
        awardedMarks: answer.awardedMarks ? Number(answer.awardedMarks) : null,
        isCorrect: answer.isCorrect,
        feedback: answer.feedback,
      })),
    };
  }

  private ensureStudentPortalActor(actor: CurrentPortalUserContext): void {
    if (actor.accountType !== 'STUDENT') {
      throw new UnauthorizedException('Only student portal accounts can attempt assessments');
    }
  }

  private async getStudentBatchIds(actor: CurrentPortalUserContext): Promise<string[]> {
    const studentBatches = await this.prisma.studentBatch.findMany({
      where: {
        studentId: actor.studentId,
        batch: {
          organizationId: actor.organizationId,
        },
      },
      select: {
        batchId: true,
      },
    });

    return studentBatches.map((item) => item.batchId);
  }

  private async getPortalAssessmentOrThrow(assessmentId: string, actor: CurrentPortalUserContext) {
    const batchIds = await this.getStudentBatchIds(actor);
    const assessment = await this.prisma.assessment.findFirst({
      where: {
        id: assessmentId,
        organizationId: actor.organizationId,
        batchId: { in: batchIds.length ? batchIds : ['00000000-0000-0000-0000-000000000000'] },
        status: 'PUBLISHED',
      },
      include: {
        subject: { select: { name: true } },
        batch: { select: { name: true } },
        questions: {
          include: { options: { orderBy: { orderIndex: 'asc' } } },
          orderBy: { orderIndex: 'asc' },
        },
        attempts: {
          where: { studentId: actor.studentId },
          include: {
            answers: true,
            result: true,
          },
          orderBy: [{ attemptNumber: 'desc' }],
        },
      },
    });

    if (!assessment) {
      throw new NotFoundException('Assessment not found');
    }

    return assessment;
  }

  private async getPortalAssignmentOrThrow(assignmentId: string, actor: CurrentPortalUserContext) {
    const batchIds = await this.getStudentBatchIds(actor);
    const assignment = await this.prisma.assignment.findFirst({
      where: {
        id: assignmentId,
        organizationId: actor.organizationId,
        batchId: { in: batchIds.length ? batchIds : ['00000000-0000-0000-0000-000000000000'] },
        status: 'PUBLISHED',
      },
      include: {
        subject: { select: { name: true } },
        batch: { select: { name: true } },
        teacher: { select: { fullName: true } },
        submissions: {
          where: { studentId: actor.studentId },
          include: {
            reviewedByTeacher: { select: { fullName: true } },
          },
          take: 1,
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

  private canSubmitAssignment(assignment: {
    status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
    dueAt: Date;
    allowLateSubmission: boolean;
  }): boolean {
    if (assignment.status !== 'PUBLISHED') {
      return false;
    }

    if (assignment.allowLateSubmission) {
      return true;
    }

    return new Date() <= assignment.dueAt;
  }

  private assertAssessmentAvailable(assessment: {
    status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
    availableFrom: Date | null;
    availableUntil: Date | null;
    startsAt: Date | null;
    endsAt: Date | null;
  }): void {
    const now = new Date();
    if (assessment.status !== 'PUBLISHED') {
      throw new UnauthorizedException('Assessment is not published');
    }
    if (assessment.availableFrom && now < assessment.availableFrom) {
      throw new UnauthorizedException('Assessment is not available yet');
    }
    if (assessment.startsAt && now < assessment.startsAt) {
      throw new UnauthorizedException('Assessment has not started yet');
    }
    if ((assessment.availableUntil && now > assessment.availableUntil) || (assessment.endsAt && now > assessment.endsAt)) {
      throw new UnauthorizedException('Assessment availability window has ended');
    }
  }

  private mapAttempt(attempt: {
    id: string;
    status: string;
    attemptNumber: number;
    startedAt: Date;
    submittedAt: Date | null;
    requiresManualReview: boolean;
    answers: Array<{
      questionId: string;
      selectedOptionId: string | null;
      answerText: string | null;
      awardedMarks: unknown;
      isCorrect: boolean | null;
      feedback: string | null;
    }>;
    result: {
      obtainedMarks: unknown;
      totalMarks: unknown;
      percentage: unknown;
      status: string;
    } | null;
  }): PortalAssessmentAttemptDto {
    return {
      id: attempt.id,
      status: attempt.status as PortalAssessmentAttemptDto['status'],
      attemptNumber: attempt.attemptNumber,
      startedAt: attempt.startedAt,
      submittedAt: attempt.submittedAt,
      requiresManualReview: attempt.requiresManualReview,
      obtainedMarks: attempt.result ? Number(attempt.result.obtainedMarks) : null,
      totalMarks: attempt.result ? Number(attempt.result.totalMarks) : null,
      percentage: attempt.result ? Number(attempt.result.percentage) : null,
      resultStatus: (attempt.result?.status as PortalAssessmentAttemptDto['resultStatus']) ?? null,
      answers: attempt.answers.map((answer) => ({
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
        answerText: answer.answerText,
        awardedMarks: answer.awardedMarks !== null ? Number(answer.awardedMarks) : null,
        isCorrect: answer.isCorrect,
        feedback: answer.feedback,
      })),
    };
  }

  private mapAssignmentSubmission(submission: {
    id: string;
    status: string;
    submissionText: string | null;
    attachmentLinks: string[];
    submittedAt: Date | null;
    reviewedAt: Date | null;
    feedback: string | null;
    awardedMarks: unknown;
    reviewedByTeacher: { fullName: string } | null;
  }): PortalAssignmentSubmissionDto {
    return {
      id: submission.id,
      status: submission.status as PortalAssignmentSubmissionDto['status'],
      submissionText: submission.submissionText,
      attachmentLinks: submission.attachmentLinks,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt,
      feedback: submission.feedback,
      awardedMarks: submission.awardedMarks !== null ? Number(submission.awardedMarks) : null,
      reviewedByTeacherName: submission.reviewedByTeacher?.fullName ?? null,
    };
  }
}
