import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createReadStream } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { Readable } from 'stream';
import { AttendanceStatus } from '@prisma/client';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentPortalUserContext } from '../../common/interfaces/current-portal-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { AcknowledgePortalItemDto, PortalAcknowledgementItemDto } from './dto/portal-acknowledgements.dto';
import { PortalAnnouncementDto } from './dto/portal-announcements.dto';
import {
  PortalAssessmentDetailDto,
  PortalAssessmentListItemDto,
  PortalAssessmentSubmitResultDto,
  PortalAssessmentAttemptDto,
  SavePortalAssessmentAttemptDto,
} from './dto/portal-assessments.dto';
import { PortalActivityFeedItemDto } from './dto/portal-activity-feed.dto';
import { PortalAssignmentDetailDto, PortalAssignmentListItemDto, PortalAssignmentSubmissionDto } from './dto/portal-assignments.dto';
import { CreatePortalFeePaymentProofDto } from './dto/create-portal-fee-payment-proof.dto';
import { PortalDashboardDto } from './dto/portal-dashboard.dto';
import { PortalDocumentDto } from './dto/portal-documents.dto';
import { PortalFeePaymentProofDto, PortalFeeRecordDto } from './dto/portal-fees.dto';
import { PortalReportCardDto } from './dto/portal-report-card.dto';
import { UpsertPortalAssignmentSubmissionDto } from '../assignments/dto/create-assignment.dto';

@Injectable()
export class PortalService {
  private readonly portalUploadsRoot = join(process.cwd(), 'uploads', 'portal');

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

  async getReportCard(actor: CurrentPortalUserContext): Promise<PortalReportCardDto> {
    const student = await this.prisma.student.findFirst({
      where: {
        id: actor.studentId,
        organizationId: actor.organizationId,
      },
      include: {
        organization: {
          select: {
            enabledModules: true,
          },
        },
        studentBatches: {
          include: {
            batch: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'desc',
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

    const [examResults, assessmentResults, assignmentSubmissions] = await Promise.all([
      this.prisma.studentExamResult.findMany({
        where: {
          organizationId: actor.organizationId,
          studentId: actor.studentId,
          status: 'PUBLISHED',
        },
        include: {
          resultItems: {
            include: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
              examSubject: {
                select: {
                  totalMarks: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.assessmentResult.findMany({
        where: {
          organizationId: actor.organizationId,
          studentId: actor.studentId,
          status: {
            in: ['PROVISIONAL', 'FINALIZED'],
          },
        },
        include: {
          assessment: {
            select: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.assignmentSubmission.findMany({
        where: {
          organizationId: actor.organizationId,
          studentId: actor.studentId,
          status: 'REVIEWED',
        },
        include: {
          assignment: {
            select: {
              subject: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },
              maxMarks: true,
            },
          },
        },
      }),
    ]);

    type SubjectAggregate = {
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      examPercentages: number[];
      assessmentPercentages: number[];
      assignmentPercentages: number[];
    };

    const bySubject = new Map<string, SubjectAggregate>();
    const getSubjectAggregate = (subject: { id: string; name: string; code: string }): SubjectAggregate => {
      const existing = bySubject.get(subject.id);
      if (existing) {
        return existing;
      }

      const created: SubjectAggregate = {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCode: subject.code,
        examPercentages: [],
        assessmentPercentages: [],
        assignmentPercentages: [],
      };
      bySubject.set(subject.id, created);
      return created;
    };

    for (const examResult of examResults) {
      for (const item of examResult.resultItems) {
        const totalMarks = Number(item.examSubject.totalMarks);
        if (!totalMarks) {
          continue;
        }

        const aggregate = getSubjectAggregate(item.subject);
        aggregate.examPercentages.push(Number(((Number(item.obtainedMarks) / totalMarks) * 100).toFixed(2)));
      }
    }

    for (const assessmentResult of assessmentResults) {
      const totalMarks = Number(assessmentResult.totalMarks);
      if (!totalMarks) {
        continue;
      }

      const aggregate = getSubjectAggregate(assessmentResult.assessment.subject);
      aggregate.assessmentPercentages.push(Number(((Number(assessmentResult.obtainedMarks) / totalMarks) * 100).toFixed(2)));
    }

    for (const submission of assignmentSubmissions) {
      const awardedMarks = submission.awardedMarks !== null ? Number(submission.awardedMarks) : null;
      const totalMarks = Number(submission.assignment.maxMarks);
      if (awardedMarks === null || !totalMarks) {
        continue;
      }

      const aggregate = getSubjectAggregate(submission.assignment.subject);
      aggregate.assignmentPercentages.push(Number(((awardedMarks / totalMarks) * 100).toFixed(2)));
    }

    const average = (values: number[]): number | null =>
      values.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;

    const subjectBreakdown = Array.from(bySubject.values())
      .map((subject) => {
        const examPercentage = average(subject.examPercentages);
        const assessmentPercentage = average(subject.assessmentPercentages);
        const assignmentPercentage = average(subject.assignmentPercentages);
        const combinedComponents = [examPercentage, assessmentPercentage, assignmentPercentage].filter(
          (value): value is number => value !== null,
        );

        return {
          subjectId: subject.subjectId,
          subjectName: subject.subjectName,
          subjectCode: subject.subjectCode,
          examPercentage,
          assessmentPercentage,
          assignmentPercentage,
          combinedPercentage: combinedComponents.length
            ? Number((combinedComponents.reduce((sum, value) => sum + value, 0) / combinedComponents.length).toFixed(2))
            : null,
        };
      })
      .sort((left, right) => left.subjectName.localeCompare(right.subjectName));

    const examAverage = average(subjectBreakdown.map((item) => item.examPercentage).filter((value): value is number => value !== null));
    const assessmentAverage = average(
      subjectBreakdown.map((item) => item.assessmentPercentage).filter((value): value is number => value !== null),
    );
    const assignmentAverage = average(
      subjectBreakdown.map((item) => item.assignmentPercentage).filter((value): value is number => value !== null),
    );
    const overallValues = subjectBreakdown.map((item) => item.combinedPercentage).filter((value): value is number => value !== null);
    const overallPercentage = average(overallValues) ?? 0;
    const currentBatch = student.studentBatches[0]?.batch ?? {
      id: 'unassigned',
      name: 'Unassigned batch',
      code: 'N/A',
    };

    return {
      studentId: student.id,
      studentName: student.fullName,
      batchName: currentBatch.name,
      batchCode: currentBatch.code,
      overallPercentage,
      overallGrade: this.toLetterGrade(overallPercentage),
      examPercentage: examAverage,
      assessmentPercentage: assessmentAverage,
      assignmentPercentage: assignmentAverage,
      publishedExamCount: examResults.length,
      finalizedAssessmentCount: assessmentResults.filter((item) => item.status === 'FINALIZED').length,
      reviewedAssignmentCount: assignmentSubmissions.length,
      subjectBreakdown,
    };
  }

  async getActivityFeed(actor: CurrentPortalUserContext): Promise<PortalActivityFeedItemDto[]> {
    const student = await this.prisma.student.findFirst({
      where: {
        id: actor.studentId,
        organizationId: actor.organizationId,
      },
      include: {
        organization: {
          select: {
            enabledModules: true,
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

    const [reminders, assignmentFeedback, assessmentFeedback, publishedResults] = await Promise.all([
      this.prisma.reminderLog.findMany({
        where: {
          organizationId: actor.organizationId,
          studentId: actor.studentId,
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
      }),
      this.prisma.assignmentSubmission.findMany({
        where: {
          organizationId: actor.organizationId,
          studentId: actor.studentId,
          status: 'REVIEWED',
        },
        include: {
          assignment: {
            select: {
              title: true,
              maxMarks: true,
              subject: {
                select: {
                  name: true,
                },
              },
            },
          },
          reviewedByTeacher: {
            select: {
              fullName: true,
            },
          },
        },
        orderBy: { reviewedAt: 'desc' },
        take: 12,
      }),
      this.prisma.assessmentAnswer.findMany({
        where: {
          organizationId: actor.organizationId,
          attempt: {
            studentId: actor.studentId,
          },
          reviewedAt: {
            not: null,
          },
          feedback: {
            not: null,
          },
        },
        include: {
          question: {
            select: {
              prompt: true,
              assessment: {
                select: {
                  title: true,
                  subject: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
          reviewedByTeacher: {
            select: {
              fullName: true,
            },
          },
        },
        orderBy: { reviewedAt: 'desc' },
        take: 12,
      }),
      this.prisma.studentExamResult.findMany({
        where: {
          organizationId: actor.organizationId,
          studentId: actor.studentId,
          status: 'PUBLISHED',
        },
        include: {
          exam: {
            select: {
              name: true,
            },
          },
          batch: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        take: 12,
      }),
    ]);

    const items: PortalActivityFeedItemDto[] = [
      ...reminders.map((item) => ({
        id: `reminder-${item.id}`,
        kind: 'REMINDER' as const,
        title: `${item.channel} reminder`,
        description: item.message,
        occurredAt: item.createdAt,
        status: item.status,
        subjectName: null,
        scoreLabel: null,
        actorName: null,
      })),
      ...assignmentFeedback
        .filter((item) => item.reviewedAt)
        .map((item) => ({
          id: `assignment-feedback-${item.id}`,
          kind: 'ASSIGNMENT_FEEDBACK' as const,
          title: `Assignment reviewed: ${item.assignment.title}`,
          description: item.feedback?.trim() || 'Teacher reviewed this assignment and published marks.',
          occurredAt: item.reviewedAt as Date,
          status: item.status,
          subjectName: item.assignment.subject.name,
          scoreLabel:
            item.awardedMarks !== null ? `${Number(item.awardedMarks)}/${Number(item.assignment.maxMarks)} marks` : null,
          actorName: item.reviewedByTeacher?.fullName ?? null,
        })),
      ...assessmentFeedback.map((item) => ({
        id: `assessment-feedback-${item.id}`,
        kind: 'ASSESSMENT_FEEDBACK' as const,
        title: `Assessment feedback: ${item.question.assessment.title}`,
        description: item.feedback?.trim() || `Teacher reviewed: ${item.question.prompt}`,
        occurredAt: item.reviewedAt as Date,
        status: 'REVIEWED',
        subjectName: item.question.assessment.subject.name,
        scoreLabel: item.awardedMarks !== null ? `${Number(item.awardedMarks)} marks awarded` : null,
        actorName: item.reviewedByTeacher?.fullName ?? null,
      })),
      ...publishedResults
        .filter((item) => item.publishedAt)
        .map((item) => ({
          id: `result-${item.id}`,
          kind: 'RESULT_PUBLISHED' as const,
          title: `Result published: ${item.exam.name}`,
          description: `Published for ${item.batch.name} with grade ${item.grade ?? 'pending'}.`,
          occurredAt: item.publishedAt as Date,
          status: item.status,
          subjectName: null,
          scoreLabel: `${Number(item.percentage)}%`,
          actorName: null,
        })),
    ];

    return items.sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime()).slice(0, 25);
  }

  async getAcknowledgements(actor: CurrentPortalUserContext): Promise<PortalAcknowledgementItemDto[]> {
    const account = await this.getPortalAccountOrThrow(actor);
    const portalAcknowledgementDelegate = (this.prisma as PrismaService & {
      portalAcknowledgement: {
        findMany: (args: {
          where: { portalAccountId: string };
        }) => Promise<Array<{ itemKey: string; acknowledgedAt: Date }>>;
        upsert: (args: {
          where: { portalAccountId_itemKey: { portalAccountId: string; itemKey: string } };
          update: { itemKind: string; title: string; acknowledgedAt: Date };
          create: {
            organizationId: string;
            portalAccountId: string;
            studentId: string;
            itemKey: string;
            itemKind: string;
            title: string;
          };
        }) => Promise<{
          itemKey: string;
          itemKind: string;
          title: string;
          updatedAt: Date;
          acknowledgedAt: Date;
        }>;
      };
    }).portalAcknowledgement as {
      findMany: (args: {
        where: { portalAccountId: string };
      }) => Promise<Array<{ itemKey: string; acknowledgedAt: Date }>>;
      upsert: (args: {
        where: { portalAccountId_itemKey: { portalAccountId: string; itemKey: string } };
        update: { itemKind: string; title: string; acknowledgedAt: Date };
        create: {
          organizationId: string;
          portalAccountId: string;
          studentId: string;
          itemKey: string;
          itemKind: string;
          title: string;
        };
      }) => Promise<{
        itemKey: string;
        itemKind: string;
        title: string;
        updatedAt: Date;
        acknowledgedAt: Date;
      }>;
    };

    const [feeRecords, assignmentSubmissions, assessmentResults, examResults, acknowledgements] = await Promise.all([
      this.prisma.feeRecord.findMany({
        where: {
          organizationId: actor.organizationId,
          studentId: actor.studentId,
          status: { in: ['OVERDUE', 'PENDING', 'PARTIAL'] },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 8,
      }),
      this.prisma.assignmentSubmission.findMany({
        where: {
          organizationId: actor.organizationId,
          studentId: actor.studentId,
          status: 'REVIEWED',
        },
        include: {
          assignment: {
            select: {
              id: true,
              title: true,
              maxMarks: true,
              subject: { select: { name: true } },
            },
          },
          reviewedByTeacher: { select: { fullName: true } },
        },
        orderBy: { reviewedAt: 'desc' },
        take: 10,
      }),
      this.prisma.assessmentResult.findMany({
        where: {
          organizationId: actor.organizationId,
          studentId: actor.studentId,
          status: { in: ['PROVISIONAL', 'FINALIZED'] },
        },
        include: {
          assessment: {
            select: {
              id: true,
              title: true,
              subject: { select: { name: true } },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      this.prisma.studentExamResult.findMany({
        where: {
          organizationId: actor.organizationId,
          studentId: actor.studentId,
          status: 'PUBLISHED',
        },
        include: {
          exam: { select: { id: true, name: true } },
        },
        orderBy: { publishedAt: 'desc' },
        take: 10,
      }),
      portalAcknowledgementDelegate.findMany({
        where: {
          portalAccountId: account.id,
        },
      }),
    ]);

    const ackMap = new Map<string, { acknowledgedAt: Date }>(acknowledgements.map((item: { itemKey: string; acknowledgedAt: Date }) => [item.itemKey, item]));

    const items: PortalAcknowledgementItemDto[] = [
      ...feeRecords.map((item: (typeof feeRecords)[number]) => {
        const itemKey = `fee:${item.id}`;
        return {
          itemKey,
          kind: 'FEE_DUE' as const,
          title: `Fee cycle ${item.month}/${item.year} needs attention`,
          description: `Outstanding amount is ${Number(item.amountDue) - Number(item.amountPaid)} with status ${item.status}.`,
          occurredAt: item.updatedAt,
          acknowledgedAt: ackMap.get(itemKey)?.acknowledgedAt ?? null,
          actorName: null,
          subjectName: null,
          scoreLabel: null,
        };
      }),
      ...assignmentSubmissions
        .filter((item: (typeof assignmentSubmissions)[number]) => item.reviewedAt)
        .map((item: (typeof assignmentSubmissions)[number]) => {
          const itemKey = `assignment-review:${item.assignment.id}:${item.id}`;
          return {
            itemKey,
            kind: 'ASSIGNMENT_FEEDBACK' as const,
            title: `Review acknowledged for ${item.assignment.title}`,
            description: item.feedback?.trim() || 'Teacher feedback and marks were posted for this assignment.',
            occurredAt: item.reviewedAt as Date,
            acknowledgedAt: ackMap.get(itemKey)?.acknowledgedAt ?? null,
            actorName: item.reviewedByTeacher?.fullName ?? null,
            subjectName: item.assignment.subject.name,
            scoreLabel:
              item.awardedMarks !== null ? `${Number(item.awardedMarks)}/${Number(item.assignment.maxMarks)} marks` : null,
          };
        }),
      ...assessmentResults.map((item: (typeof assessmentResults)[number]) => {
        const itemKey = `assessment-result:${item.assessment.id}:${item.id}`;
        return {
          itemKey,
          kind: 'ASSESSMENT_RESULT' as const,
          title: `Assessment result available for ${item.assessment.title}`,
          description: `The latest assessment result is ${item.status.toLowerCase()} and ready for acknowledgement.`,
          occurredAt: item.updatedAt,
          acknowledgedAt: ackMap.get(itemKey)?.acknowledgedAt ?? null,
          actorName: null,
          subjectName: item.assessment.subject.name,
          scoreLabel: `${Number(item.percentage)}%`,
        };
      }),
      ...examResults
        .filter((item: (typeof examResults)[number]) => item.publishedAt)
        .map((item: (typeof examResults)[number]) => {
          const itemKey = `exam-result:${item.exam.id}:${item.id}`;
          return {
            itemKey,
            kind: 'EXAM_RESULT' as const,
            title: `Published exam result: ${item.exam.name}`,
            description: `Exam result is available with grade ${item.grade ?? 'pending'}.`,
            occurredAt: item.publishedAt as Date,
            acknowledgedAt: ackMap.get(itemKey)?.acknowledgedAt ?? null,
            actorName: null,
            subjectName: null,
            scoreLabel: `${Number(item.percentage)}%`,
          };
        }),
    ];

    return items.sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime()).slice(0, 30);
  }

  async acknowledgeItem(payload: AcknowledgePortalItemDto, actor: CurrentPortalUserContext): Promise<PortalAcknowledgementItemDto> {
    const account = await this.getPortalAccountOrThrow(actor);
    const portalAcknowledgementDelegate = (this.prisma as PrismaService & {
      portalAcknowledgement: {
        upsert: (args: {
          where: { portalAccountId_itemKey: { portalAccountId: string; itemKey: string } };
          update: { itemKind: string; title: string; acknowledgedAt: Date };
          create: {
            organizationId: string;
            portalAccountId: string;
            studentId: string;
            itemKey: string;
            itemKind: string;
            title: string;
          };
        }) => Promise<{
          itemKey: string;
          itemKind: string;
          title: string;
          updatedAt: Date;
          acknowledgedAt: Date;
        }>;
      };
    }).portalAcknowledgement;

    const saved = await portalAcknowledgementDelegate.upsert({
      where: {
        portalAccountId_itemKey: {
          portalAccountId: account.id,
          itemKey: payload.itemKey,
        },
      },
      update: {
        itemKind: payload.kind,
        title: payload.title,
        acknowledgedAt: new Date(),
      },
      create: {
        organizationId: actor.organizationId,
        portalAccountId: account.id,
        studentId: actor.studentId,
        itemKey: payload.itemKey,
        itemKind: payload.kind,
        title: payload.title,
      },
    });

    return {
      itemKey: saved.itemKey,
      kind: this.toAcknowledgementKind(saved.itemKind),
      title: saved.title,
      description: 'Acknowledgement saved.',
      occurredAt: saved.updatedAt,
      acknowledgedAt: saved.acknowledgedAt,
      actorName: null,
      subjectName: null,
      scoreLabel: null,
    };
  }

  async getDocuments(actor: CurrentPortalUserContext): Promise<PortalDocumentDto[]> {
    await this.getPortalAccountOrThrow(actor);

    const uploadedDocuments = await this.prisma.studentDocument.findMany({
      where: {
        organizationId: actor.organizationId,
        studentId: actor.studentId,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const generatedDocuments: PortalDocumentDto[] = [
      {
        id: 'generated:unified-report-card-pdf',
        title: 'Unified Report Card PDF',
        kind: 'GENERATED',
        category: 'ACADEMIC',
        fileName: 'unified-report-card.pdf',
        mimeType: 'application/pdf',
        createdAt: new Date(),
        description: 'Printable academic PDF built from current exam, assessment, and assignment data.',
      },
      {
        id: 'generated:activity-timeline-pdf',
        title: 'Portal Activity Timeline PDF',
        kind: 'GENERATED',
        category: 'ACADEMIC',
        fileName: 'portal-activity-timeline.pdf',
        mimeType: 'application/pdf',
        createdAt: new Date(),
        description: 'Printable timeline PDF covering reminders, teacher feedback, and result publication activity.',
      },
      {
        id: 'generated:unified-report-card-csv',
        title: 'Unified Report Card CSV',
        kind: 'GENERATED',
        category: 'ACADEMIC',
        fileName: 'unified-report-card.csv',
        mimeType: 'text/csv',
        createdAt: new Date(),
        description: 'Spreadsheet export of current combined academic performance.',
      },
      {
        id: 'generated:activity-timeline-csv',
        title: 'Portal Activity Timeline CSV',
        kind: 'GENERATED',
        category: 'ACADEMIC',
        fileName: 'portal-activity-timeline.csv',
        mimeType: 'text/csv',
        createdAt: new Date(),
        description: 'Spreadsheet export of recent reminders, feedback, and published result events.',
      },
    ];

    return [
      ...generatedDocuments,
      ...uploadedDocuments.map((document) => ({
        id: `uploaded:${document.id}`,
        title: document.title,
        kind: 'UPLOADED' as const,
        category: (document.type === 'ACADEMIC_RECORD' ? 'ACADEMIC' : 'STUDENT_RECORD') as 'ACADEMIC' | 'STUDENT_RECORD',
        fileName: document.originalName,
        mimeType: document.mimeType,
        createdAt: document.createdAt,
        description: document.notes,
      })),
    ];
  }

  async getDocumentDownload(documentId: string, actor: CurrentPortalUserContext): Promise<{
    filename: string;
    mimeType: string;
    stream: Readable;
  }> {
    await this.getPortalAccountOrThrow(actor);

    if (documentId === 'generated:unified-report-card-pdf') {
      const reportCard = await this.getReportCard(actor);
      const lines = [
        'Unified Report Card',
        `${reportCard.studentName} · ${reportCard.batchName} (${reportCard.batchCode})`,
        `Overall: ${reportCard.overallPercentage}% · Grade ${reportCard.overallGrade}`,
        '',
        ...reportCard.subjectBreakdown.flatMap((item) => [
          `${item.subjectName} (${item.subjectCode})`,
          `Exam ${item.examPercentage ?? '-'}% | Assessment ${item.assessmentPercentage ?? '-'}% | Assignment ${item.assignmentPercentage ?? '-'}% | Combined ${item.combinedPercentage ?? '-'}%`,
          '',
        ]),
      ];
      return {
        filename: 'unified-report-card.pdf',
        mimeType: 'application/pdf',
        stream: Readable.from([this.generateSimplePdf(lines)]),
      };
    }

    if (documentId === 'generated:activity-timeline-pdf') {
      const feed = await this.getActivityFeed(actor);
      const lines = [
        'Portal Activity Timeline',
        ...feed.slice(0, 20).flatMap((item) => [
          `${item.title}`,
          `${item.occurredAt.toISOString()} | ${item.kind}${item.scoreLabel ? ` | ${item.scoreLabel}` : ''}`,
          item.description,
          '',
        ]),
      ];
      return {
        filename: 'portal-activity-timeline.pdf',
        mimeType: 'application/pdf',
        stream: Readable.from([this.generateSimplePdf(lines)]),
      };
    }

    if (documentId === 'generated:unified-report-card-csv') {
      const reportCard = await this.getReportCard(actor);
      const header = 'Subject Code,Subject Name,Exam %,Assessment %,Assignment %,Combined %';
      const rows = reportCard.subjectBreakdown.map(
        (item) =>
          `${item.subjectCode},${this.escapeCsv(item.subjectName)},${item.examPercentage ?? ''},${item.assessmentPercentage ?? ''},${item.assignmentPercentage ?? ''},${item.combinedPercentage ?? ''}`,
      );
      const summary = `Overall,,${reportCard.examPercentage ?? ''},${reportCard.assessmentPercentage ?? ''},${reportCard.assignmentPercentage ?? ''},${reportCard.overallPercentage}`;
      return {
        filename: 'unified-report-card.csv',
        mimeType: 'text/csv',
        stream: Readable.from([`${header}\n${rows.join('\n')}\n${summary}\n`]),
      };
    }

    if (documentId === 'generated:activity-timeline-csv') {
      const feed = await this.getActivityFeed(actor);
      const header = 'Date,Kind,Title,Description,Status,Subject,Score,Actor';
      const rows = feed.map(
        (item) =>
          `${item.occurredAt.toISOString()},${item.kind},${this.escapeCsv(item.title)},${this.escapeCsv(item.description)},${item.status ?? ''},${item.subjectName ?? ''},${item.scoreLabel ?? ''},${item.actorName ?? ''}`,
      );
      return {
        filename: 'portal-activity-timeline.csv',
        mimeType: 'text/csv',
        stream: Readable.from([`${header}\n${rows.join('\n')}\n`]),
      };
    }

    if (!documentId.startsWith('uploaded:')) {
      throw new NotFoundException('Portal document not found');
    }

    const uploadedId = documentId.replace('uploaded:', '');
    const document = await this.prisma.studentDocument.findFirst({
      where: {
        id: uploadedId,
        organizationId: actor.organizationId,
        studentId: actor.studentId,
      },
    });

    if (!document) {
      throw new NotFoundException('Portal document not found');
    }

    return {
      filename: document.originalName,
      mimeType: document.mimeType,
      stream: createReadStream(document.storagePath),
    };
  }

  async getAnnouncements(actor: CurrentPortalUserContext): Promise<PortalAnnouncementDto[]> {
    await this.getPortalAccountOrThrow(actor);

    const announcements = await this.prisma.announcement.findMany({
      where: {
        organizationId: actor.organizationId,
        isPublished: true,
        AND: [
          {
            OR: [{ audience: actor.accountType }, { audience: 'BOTH' }],
          },
          {
            OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }],
          },
        ],
      },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 20,
    });

    return announcements.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      category: item.category,
      audience: item.audience,
      isPinned: item.isPinned,
      publishedAt: item.publishedAt,
      expiresAt: item.expiresAt,
    }));
  }

  async getFees(actor: CurrentPortalUserContext): Promise<PortalFeeRecordDto[]> {
    await this.getPortalAccountOrThrow(actor);

    const feeRecords = await this.prisma.feeRecord.findMany({
      where: {
        organizationId: actor.organizationId,
        studentId: actor.studentId,
      },
      include: {
        paymentProofs: {
          orderBy: { submittedAt: 'desc' },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: 18,
    });

    return feeRecords.map((item) => ({
      id: item.id,
      month: item.month,
      year: item.year,
      amountDue: Number(item.amountDue),
      amountPaid: Number(item.amountPaid),
      pendingAmount: Math.max(Number(item.amountDue) - Number(item.amountPaid), 0),
      status: item.status,
      paidAt: item.paidAt,
      remarks: item.remarks,
      paymentMethod: item.paymentMethod ?? null,
      proofs: item.paymentProofs.map((proof) => this.mapPaymentProof(proof)),
    }));
  }

  async uploadPaymentProof(
    feeRecordId: string,
    payload: CreatePortalFeePaymentProofDto,
    file: Express.Multer.File,
    actor: CurrentPortalUserContext,
  ): Promise<PortalFeePaymentProofDto> {
    if (actor.accountType !== 'PARENT') {
      throw new UnauthorizedException('Only parent portal accounts can upload payment proofs');
    }

    const account = await this.getPortalAccountOrThrow(actor);
    const feeRecord = await this.prisma.feeRecord.findFirst({
      where: {
        id: feeRecordId,
        organizationId: actor.organizationId,
        studentId: actor.studentId,
      },
    });

    if (!feeRecord) {
      throw new NotFoundException('Fee record not found');
    }

    const storagePath = await this.storePortalFile(file, 'fee-proofs', actor.organizationId, actor.studentId);
    const proof = await this.prisma.feePaymentProof.create({
      data: {
        organizationId: actor.organizationId,
        feeRecordId: feeRecord.id,
        studentId: actor.studentId,
        portalAccountId: account.id,
        title: payload.title,
        notes: payload.notes,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        storagePath,
      },
    });

    return this.mapPaymentProof(proof);
  }

  async getPaymentProofDownload(
    proofId: string,
    actor: CurrentPortalUserContext,
  ): Promise<{ filename: string; mimeType: string; stream: Readable }> {
    await this.getPortalAccountOrThrow(actor);
    const proof = await this.prisma.feePaymentProof.findFirst({
      where: {
        id: proofId,
        organizationId: actor.organizationId,
        studentId: actor.studentId,
      },
    });

    if (!proof) {
      throw new NotFoundException('Payment proof not found');
    }

    return {
      filename: proof.originalName,
      mimeType: proof.mimeType,
      stream: createReadStream(proof.storagePath),
    };
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

  private toLetterGrade(percentage: number): string {
    if (percentage >= 90) {
      return 'A+';
    }
    if (percentage >= 80) {
      return 'A';
    }
    if (percentage >= 70) {
      return 'B';
    }
    if (percentage >= 60) {
      return 'C';
    }
    if (percentage >= 50) {
      return 'D';
    }
    return 'F';
  }

  private async getPortalAccountOrThrow(actor: CurrentPortalUserContext) {
    const account = await this.prisma.portalAccount.findFirst({
      where: {
        id: actor.accountId,
        organizationId: actor.organizationId,
        studentId: actor.studentId,
        type: actor.accountType,
        isActive: true,
      },
    });

    if (!account) {
      throw new NotFoundException('Portal account not found');
    }

    return account;
  }

  private toAcknowledgementKind(kind: string): PortalAcknowledgementItemDto['kind'] {
    if (kind === 'FEE_DUE' || kind === 'ASSIGNMENT_FEEDBACK' || kind === 'ASSESSMENT_RESULT' || kind === 'EXAM_RESULT') {
      return kind;
    }
    return 'FEE_DUE';
  }

  private mapPaymentProof(proof: {
    id: string;
    title: string;
    notes: string | null;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    status: string;
    submittedAt: Date;
    reviewedAt: Date | null;
    rejectionReason: string | null;
  }): PortalFeePaymentProofDto {
    return {
      id: proof.id,
      title: proof.title,
      notes: proof.notes,
      originalName: proof.originalName,
      mimeType: proof.mimeType,
      sizeBytes: proof.sizeBytes,
      status: proof.status as PortalFeePaymentProofDto['status'],
      submittedAt: proof.submittedAt,
      reviewedAt: proof.reviewedAt,
      rejectionReason: proof.rejectionReason,
    };
  }

  private async storePortalFile(
    file: Express.Multer.File,
    bucket: 'fee-proofs',
    organizationId: string,
    studentId: string,
  ): Promise<string> {
    const extension = extname(file.originalname);
    const basePath = join(this.portalUploadsRoot, bucket, organizationId, studentId);
    await mkdir(basePath, { recursive: true });
    const filename = `${randomUUID()}${extension}`;
    const storagePath = join(basePath, filename);
    await writeFile(storagePath, file.buffer);
    return storagePath;
  }

  private generateSimplePdf(lines: string[]): Buffer {
    const pageWidth = 595;
    const pageHeight = 842;
    const fontSize = 12;
    const left = 48;
    const top = 800;
    const lineHeight = 16;
    let y = top;
    const contentLines: string[] = ['BT', `/F1 ${fontSize} Tf`];

    for (const line of lines) {
      if (y < 60) {
        break;
      }
      contentLines.push(`${left} ${y} Td (${this.escapePdfText(line)}) Tj`);
      y -= lineHeight;
    }
    contentLines.push('ET');
    const content = contentLines.join('\n');
    const objects = [
      '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
      '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
      `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj`,
      '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
      `5 0 obj << /Length ${Buffer.byteLength(content, 'utf8')} >> stream\n${content}\nendstream endobj`,
    ];
    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    for (const object of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += `${object}\n`;
    }
    const xrefStart = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let index = 1; index < offsets.length; index += 1) {
      pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return Buffer.from(pdf, 'utf8');
  }

  private escapePdfText(value: string): string {
    return value.replaceAll('\\', '\\\\').replaceAll('(', '\\(').replaceAll(')', '\\)').replace(/\r?\n/g, ' ');
  }

  private escapeCsv(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replaceAll('"', '""')}"`;
    }
    return value;
  }
}
