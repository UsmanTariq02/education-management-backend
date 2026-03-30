import { Injectable } from '@nestjs/common';
import { AttendanceStatus, FeeRecordStatus, StudentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AcademicDashboardSummary,
  AttendanceBatchPoint,
  AttendanceDailyTrendPoint,
  BatchCollectionPoint,
  BatchPerformancePoint,
  BatchStatusPoint,
  ExamSchedulePoint,
  FeeCollectionComparisonPoint,
  FeeCollectionOverview,
  FeeCollectionPeriodSummary,
  FeeCollectionTrendPoint,
  FeeStatusPoint,
  GradeDistributionPoint,
  ReminderDailyTrendPoint,
  ReminderChannelPoint,
  ReportRepository,
  ResultStatusPoint,
  UnifiedReportCard,
  UnifiedReportCardSubjectPoint,
  AttendanceStatusPoint,
  EnrollmentTrendPoint,
  ReminderStatusPoint,
  StudentBatchDistributionPoint,
  StudentStatusPoint,
  UserRoleDistributionPoint,
  UserStatusPoint,
} from '../interfaces/report.repository.interface';

@Injectable()
export class ReportPrismaRepository implements ReportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getFeeCollectionOverview(organizationId?: string): Promise<FeeCollectionOverview> {
    const now = new Date();
    const currentMonth = this.getMonthPeriod(now.getFullYear(), now.getMonth() + 1, 'Current Month');
    const currentQuarter = this.getQuarterPeriod(now, 'Current Quarter');
    const currentYear = this.getYearPeriod(now.getFullYear(), 'Current Year');

    const [monthSummary, quarterSummary, yearSummary] = await Promise.all([
      this.summarizeFeePeriod(currentMonth, organizationId),
      this.summarizeFeePeriod(currentQuarter, organizationId),
      this.summarizeFeePeriod(currentYear, organizationId),
    ]);

    return {
      currentMonth: monthSummary,
      currentQuarter: quarterSummary,
      currentYear: yearSummary,
    };
  }

  async getFeeCollectionComparison(organizationId?: string): Promise<FeeCollectionComparisonPoint[]> {
    const now = new Date();
    const currentMonth = this.getMonthPeriod(now.getFullYear(), now.getMonth() + 1, 'Current Month');
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = this.getMonthPeriod(
      previousMonthDate.getFullYear(),
      previousMonthDate.getMonth() + 1,
      'Previous Month',
    );

    const currentQuarter = this.getQuarterPeriod(now, 'Current Quarter');
    const previousQuarterStartMonth = currentQuarter.startMonth - 3;
    const previousQuarterDate = new Date(currentQuarter.year, previousQuarterStartMonth - 1, 1);
    const previousQuarter = this.getQuarterPeriod(previousQuarterDate, 'Previous Quarter');

    const currentYear = this.getYearPeriod(now.getFullYear(), 'Current Year');
    const previousYear = this.getYearPeriod(now.getFullYear() - 1, 'Previous Year');

    const [
      currentMonthSummary,
      previousMonthSummary,
      currentQuarterSummary,
      previousQuarterSummary,
      currentYearSummary,
      previousYearSummary,
    ] = await Promise.all([
      this.summarizeFeePeriod(currentMonth, organizationId),
      this.summarizeFeePeriod(previousMonth, organizationId),
      this.summarizeFeePeriod(currentQuarter, organizationId),
      this.summarizeFeePeriod(previousQuarter, organizationId),
      this.summarizeFeePeriod(currentYear, organizationId),
      this.summarizeFeePeriod(previousYear, organizationId),
    ]);

    return [
      {
        period: 'MONTH',
        currentCollected: currentMonthSummary.collected,
        previousCollected: previousMonthSummary.collected,
        currentPending: currentMonthSummary.pending,
        previousPending: previousMonthSummary.pending,
      },
      {
        period: 'QUARTER',
        currentCollected: currentQuarterSummary.collected,
        previousCollected: previousQuarterSummary.collected,
        currentPending: currentQuarterSummary.pending,
        previousPending: previousQuarterSummary.pending,
      },
      {
        period: 'YEAR',
        currentCollected: currentYearSummary.collected,
        previousCollected: previousYearSummary.collected,
        currentPending: currentYearSummary.pending,
        previousPending: previousYearSummary.pending,
      },
    ];
  }

  async getDashboardSummary(organizationId?: string) {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const studentWhere = organizationId ? { organizationId } : undefined;
    const feeWhere = organizationId ? { organizationId, month, year } : { month, year };
    const unpaidFeeWhere = organizationId
      ? { organizationId, status: { in: [FeeRecordStatus.PENDING, FeeRecordStatus.PARTIAL, FeeRecordStatus.OVERDUE] } }
      : { status: { in: [FeeRecordStatus.PENDING, FeeRecordStatus.PARTIAL, FeeRecordStatus.OVERDUE] } };
    const attendanceWhere = organizationId ? { organizationId, status: AttendanceStatus.PRESENT } : { status: AttendanceStatus.PRESENT };

    const [totalStudents, activeStudents, feeAggregate, unpaidFeeCount, presentAttendanceCount] =
      await this.prisma.$transaction([
        this.prisma.student.count({ where: studentWhere }),
        this.prisma.student.count({ where: { ...studentWhere, status: StudentStatus.ACTIVE } }),
        this.prisma.feeRecord.aggregate({
          _sum: { amountPaid: true },
          where: feeWhere,
        }),
        this.prisma.feeRecord.count({
          where: unpaidFeeWhere,
        }),
        this.prisma.attendance.count({ where: attendanceWhere }),
      ]);

    return {
      totalStudents,
      activeStudents,
      monthlyFeeCollection: Number(feeAggregate._sum.amountPaid ?? 0),
      unpaidFeeCount,
      presentAttendanceCount,
    };
  }

  async getEnrollmentTrend(limit: number, organizationId?: string): Promise<EnrollmentTrendPoint[]> {
    const organizationFilter = organizationId
      ? Prisma.sql`WHERE "organizationId" = ${organizationId}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<Array<{ month: Date; count: bigint }>>(Prisma.sql`
      SELECT date_trunc('month', "admissionDate") AS month, COUNT(*)::bigint AS count
      FROM "Student"
      ${organizationFilter}
      GROUP BY date_trunc('month', "admissionDate")
      ORDER BY month DESC
      LIMIT ${limit}
    `);

    return rows
      .map((row) => ({
        month: row.month.toISOString().slice(0, 7),
        count: Number(row.count),
      }))
      .reverse();
  }

  async getFeeCollectionTrend(limit: number, organizationId?: string): Promise<FeeCollectionTrendPoint[]> {
    const rows = await this.prisma.feeRecord.groupBy({
      by: ['year', 'month'],
      _sum: {
        amountPaid: true,
      },
      where: organizationId ? { organizationId } : undefined,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: limit,
    });

    return rows
      .map((row) => ({
        month: `${row.year}-${String(row.month).padStart(2, '0')}`,
        collected: Number(row._sum.amountPaid ?? 0),
      }))
      .reverse();
  }

  async getBatchCollectionSummary(organizationId?: string): Promise<BatchCollectionPoint[]> {
    const grouped = await this.prisma.feeRecord.groupBy({
      by: ['batchId'],
      _sum: {
        amountPaid: true,
      },
      where: organizationId ? { organizationId } : undefined,
    });

    const batchIds = grouped
      .map((row) => row.batchId)
      .filter((batchId): batchId is string => batchId !== null);
    const batches = batchIds.length
      ? await this.prisma.batch.findMany({
          where: {
            id: { in: batchIds },
            organizationId: organizationId ?? undefined,
          },
          select: {
            id: true,
            name: true,
            code: true,
          },
        })
      : [];
    const batchMap = new Map(batches.map((batch) => [batch.id, batch]));

    return grouped.map((row) => {
      const batch = row.batchId ? batchMap.get(row.batchId) : null;

      return {
        batchId: row.batchId,
        batchName: batch?.name ?? 'Unassigned',
        batchCode: batch?.code ?? 'UNASSIGNED',
        total: Number(row._sum.amountPaid ?? 0),
      };
    });
  }

  async getAttendanceStatusSummary(organizationId?: string): Promise<AttendanceStatusPoint[]> {
    const rows = await this.prisma.attendance.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
      where: organizationId ? { organizationId } : undefined,
      orderBy: {
        status: 'asc',
      },
    });

    return rows.map((row) => ({
      status: row.status,
      total: row._count.status,
    }));
  }

  async getReminderChannelSummary(organizationId?: string): Promise<ReminderChannelPoint[]> {
    const rows = await this.prisma.reminderLog.groupBy({
      by: ['channel'],
      _count: {
        channel: true,
      },
      where: organizationId ? { organizationId } : undefined,
      orderBy: {
        channel: 'asc',
      },
    });

    return rows.map((row) => ({
      channel: row.channel,
      count: row._count.channel,
    }));
  }

  async getStudentStatusBreakdown(organizationId?: string): Promise<StudentStatusPoint[]> {
    const rows = await this.prisma.student.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
      where: organizationId ? { organizationId } : undefined,
      orderBy: {
        status: 'asc',
      },
    });

    return rows.map((row) => ({
      status: row.status,
      total: row._count.status,
    }));
  }

  async getStudentBatchDistribution(organizationId?: string): Promise<StudentBatchDistributionPoint[]> {
    const grouped = await this.prisma.studentBatch.groupBy({
      by: ['batchId'],
      _count: {
        batchId: true,
      },
      where: organizationId ? { batch: { organizationId } } : undefined,
    });

    const batches = await this.prisma.batch.findMany({
      where: {
        id: { in: grouped.map((row) => row.batchId) },
        organizationId: organizationId ?? undefined,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });
    const batchMap = new Map(batches.map((batch) => [batch.id, batch]));

    return grouped.map((row) => ({
      batchId: row.batchId,
      batchName: batchMap.get(row.batchId)?.name ?? row.batchId,
      batchCode: batchMap.get(row.batchId)?.code ?? row.batchId.slice(0, 8),
      total: row._count.batchId,
    }));
  }

  async getBatchStatusSummary(organizationId?: string): Promise<BatchStatusPoint[]> {
    const [active, inactive] = await this.prisma.$transaction([
      this.prisma.batch.count({ where: { organizationId: organizationId ?? undefined, isActive: true } }),
      this.prisma.batch.count({ where: { organizationId: organizationId ?? undefined, isActive: false } }),
    ]);

    return [
      { status: 'ACTIVE', total: active },
      { status: 'INACTIVE', total: inactive },
    ];
  }

  async getFeeStatusBreakdown(organizationId?: string): Promise<FeeStatusPoint[]> {
    const rows = await this.prisma.feeRecord.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
      where: organizationId ? { organizationId } : undefined,
      orderBy: {
        status: 'asc',
      },
    });

    return rows.map((row) => ({
      status: row.status,
      total: row._count.status,
    }));
  }

  async getAttendanceDailyTrend(limit: number, organizationId?: string): Promise<AttendanceDailyTrendPoint[]> {
    const organizationFilter = organizationId
      ? Prisma.sql`WHERE "organizationId" = ${organizationId}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{ date: Date; status: AttendanceStatus; total: bigint }>
    >(Prisma.sql`
      SELECT date_trunc('day', "attendanceDate") AS date, status, COUNT(*)::bigint AS total
      FROM "Attendance"
      ${organizationFilter}
      GROUP BY date_trunc('day', "attendanceDate"), status
      ORDER BY date DESC
      LIMIT ${limit * 4}
    `);

    const grouped = new Map<string, AttendanceDailyTrendPoint>();

    rows.forEach((row) => {
      const date = row.date.toISOString().slice(0, 10);
      const existing = grouped.get(date) ?? {
        date,
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
      };
      const total = Number(row.total);

      if (row.status === 'PRESENT') existing.present = total;
      if (row.status === 'ABSENT') existing.absent = total;
      if (row.status === 'LATE') existing.late = total;
      if (row.status === 'LEAVE') existing.leave = total;

      grouped.set(date, existing);
    });

    return Array.from(grouped.values())
      .sort((left, right) => left.date.localeCompare(right.date))
      .slice(-limit);
  }

  async getAttendanceBatchSummary(organizationId?: string): Promise<AttendanceBatchPoint[]> {
    const grouped = await this.prisma.attendance.groupBy({
      by: ['batchId'],
      _count: {
        batchId: true,
      },
      where: organizationId ? { organizationId } : undefined,
    });

    const batches = await this.prisma.batch.findMany({
      where: {
        id: { in: grouped.map((row) => row.batchId) },
        organizationId: organizationId ?? undefined,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });
    const batchMap = new Map(batches.map((batch) => [batch.id, batch]));

    return grouped.map((row) => ({
      batchId: row.batchId,
      batchName: batchMap.get(row.batchId)?.name ?? row.batchId,
      batchCode: batchMap.get(row.batchId)?.code ?? row.batchId.slice(0, 8),
      total: row._count.batchId,
    }));
  }

  async getReminderStatusBreakdown(organizationId?: string): Promise<ReminderStatusPoint[]> {
    const rows = await this.prisma.reminderLog.groupBy({
      by: ['status'],
      _count: {
        status: true,
      },
      where: organizationId ? { organizationId } : undefined,
      orderBy: {
        status: 'asc',
      },
    });

    return rows.map((row) => ({
      status: row.status,
      total: row._count.status,
    }));
  }

  async getReminderDailyTrend(limit: number, organizationId?: string): Promise<ReminderDailyTrendPoint[]> {
    const organizationFilter = organizationId
      ? Prisma.sql`WHERE "organizationId" = ${organizationId}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<Array<{ date: Date; total: bigint }>>(Prisma.sql`
      SELECT date_trunc('day', "createdAt") AS date, COUNT(*)::bigint AS total
      FROM "ReminderLog"
      ${organizationFilter}
      GROUP BY date_trunc('day', "createdAt")
      ORDER BY date DESC
      LIMIT ${limit}
    `);

    return rows
      .map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        total: Number(row.total),
      }))
      .reverse();
  }

  async getUserRoleDistribution(organizationId?: string): Promise<UserRoleDistributionPoint[]> {
    const grouped = organizationId
      ? await this.prisma.userRole.groupBy({
          by: ['roleId'],
          _count: {
            roleId: true,
          },
          where: {
            user: {
              organizationId,
            },
          },
        })
      : await this.prisma.userRole.groupBy({
          by: ['roleId'],
          _count: {
            roleId: true,
          },
        });

    const roles = await this.prisma.role.findMany({
      where: {
        id: { in: grouped.map((row) => row.roleId) },
      },
      select: {
        id: true,
        name: true,
      },
    });
    const roleMap = new Map(roles.map((role) => [role.id, role]));

    return grouped.map((row) => ({
      roleId: row.roleId,
      roleName: roleMap.get(row.roleId)?.name ?? row.roleId,
      total: row._count.roleId,
    }));
  }

  async getUserStatusSummary(organizationId?: string): Promise<UserStatusPoint[]> {
    const [active, inactive] = await this.prisma.$transaction([
      this.prisma.user.count({ where: { organizationId: organizationId ?? undefined, isActive: true } }),
      this.prisma.user.count({ where: { organizationId: organizationId ?? undefined, isActive: false } }),
    ]);

    return [
      { status: 'ACTIVE', total: active },
      { status: 'INACTIVE', total: inactive },
    ];
  }

  async getAcademicDashboardSummary(organizationId?: string): Promise<AcademicDashboardSummary> {
    const [totalExams, publishedExams, totalResults, publishedResults, averageAggregate] = await this.prisma.$transaction([
      this.prisma.exam.count({ where: organizationId ? { organizationId } : undefined }),
      this.prisma.exam.count({ where: organizationId ? { organizationId, isPublished: true } : { isPublished: true } }),
      this.prisma.studentExamResult.count({ where: organizationId ? { organizationId } : undefined }),
      this.prisma.studentExamResult.count({
        where: organizationId ? { organizationId, status: 'PUBLISHED' } : { status: 'PUBLISHED' },
      }),
      this.prisma.studentExamResult.aggregate({
        _avg: { percentage: true },
        where: organizationId ? { organizationId } : undefined,
      }),
    ]);

    return {
      totalExams,
      publishedExams,
      totalResults,
      publishedResults,
      averagePercentage: Number(averageAggregate._avg.percentage ?? 0),
    };
  }

  async getUnifiedReportCards(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<UnifiedReportCard>> {
    const where: Prisma.StudentWhereInput = {
      ...(organizationId ? { organizationId } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { studentBatches: { some: { batch: { name: { contains: query.search, mode: 'insensitive' } } } } },
            ],
          }
        : {}),
    };

    const [students, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        include: {
          studentBatches: {
            include: { batch: { select: { id: true, name: true, code: true } } },
            orderBy: { joinedAt: 'desc' },
          },
          examResults: {
            where: { status: 'PUBLISHED' },
            include: {
              resultItems: {
                include: {
                  subject: { select: { id: true, name: true, code: true } },
                  examSubject: { select: { totalMarks: true } },
                },
              },
            },
          },
          assessmentResults: {
            where: { status: { in: ['PROVISIONAL', 'FINALIZED'] } },
            include: {
              assessment: {
                select: {
                  id: true,
                  subject: { select: { id: true, name: true, code: true } },
                },
              },
            },
          },
          assignmentSubmissions: {
            where: { status: 'REVIEWED' },
            include: {
              assignment: {
                select: {
                  id: true,
                  subject: { select: { id: true, name: true, code: true } },
                  maxMarks: true,
                },
              },
            },
          },
        },
        ...buildPagination(query),
        orderBy: { fullName: query.sortOrder },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      items: students.map((student) => this.toUnifiedReportCard(student)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async getGradeDistribution(organizationId?: string): Promise<GradeDistributionPoint[]> {
    const rows = await this.prisma.studentExamResult.groupBy({
      by: ['grade'],
      _count: { grade: true },
      where: organizationId ? { organizationId } : undefined,
      orderBy: { grade: 'asc' },
    });

    return rows.map((row) => ({
      grade: row.grade ?? 'N/A',
      total: row._count.grade,
    }));
  }

  async getExamScheduleTrend(limit: number, organizationId?: string): Promise<ExamSchedulePoint[]> {
    const organizationFilter = organizationId
      ? Prisma.sql`WHERE "organizationId" = ${organizationId}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<Array<{ month: Date; count: bigint }>>(Prisma.sql`
      SELECT date_trunc('month', "examDate") AS month, COUNT(*)::bigint AS count
      FROM "Exam"
      ${organizationFilter}
      GROUP BY date_trunc('month', "examDate")
      ORDER BY month DESC
      LIMIT ${limit}
    `);

    return rows
      .map((row) => ({
        month: row.month.toISOString().slice(0, 7),
        count: Number(row.count),
      }))
      .reverse();
  }

  async getBatchPerformance(organizationId?: string): Promise<BatchPerformancePoint[]> {
    const grouped = await this.prisma.studentExamResult.groupBy({
      by: ['batchId'],
      _avg: { percentage: true },
      where: organizationId ? { organizationId } : undefined,
    });

    const batches = await this.prisma.batch.findMany({
      where: {
        id: { in: grouped.map((item) => item.batchId) },
        organizationId: organizationId ?? undefined,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });
    const batchMap = new Map(batches.map((batch) => [batch.id, batch]));

    return grouped.map((row) => ({
      batchId: row.batchId,
      batchName: batchMap.get(row.batchId)?.name ?? row.batchId,
      batchCode: batchMap.get(row.batchId)?.code ?? row.batchId.slice(0, 8),
      averagePercentage: Number(row._avg.percentage ?? 0),
    }));
  }

  async getResultStatusSummary(organizationId?: string): Promise<ResultStatusPoint[]> {
    const rows = await this.prisma.studentExamResult.groupBy({
      by: ['status'],
      _count: { status: true },
      where: organizationId ? { organizationId } : undefined,
      orderBy: { status: 'asc' },
    });

    return rows.map((row) => ({
      status: row.status,
      total: row._count.status,
    }));
  }

  private getMonthPeriod(year: number, month: number, label: string) {
    return {
      label,
      year,
      startMonth: month,
      endMonth: month,
    };
  }

  private getQuarterPeriod(date: Date, label: string) {
    const month = date.getMonth() + 1;
    const startMonth = Math.floor((month - 1) / 3) * 3 + 1;

    return {
      label,
      year: date.getFullYear(),
      startMonth,
      endMonth: startMonth + 2,
    };
  }

  private getYearPeriod(year: number, label: string) {
    return {
      label,
      year,
      startMonth: 1,
      endMonth: 12,
    };
  }

  private async summarizeFeePeriod(
    period: {
      label: string;
      year: number;
      startMonth: number;
      endMonth: number;
    },
    organizationId?: string,
  ): Promise<FeeCollectionPeriodSummary> {
    const where = this.buildFeePeriodWhere(period, organizationId);
    const [aggregate, overdueRows] = await Promise.all([
      this.prisma.feeRecord.aggregate({
        _sum: {
          amountDue: true,
          amountPaid: true,
        },
        where,
      }),
      this.prisma.feeRecord.findMany({
        where: {
          ...where,
          status: FeeRecordStatus.OVERDUE,
        },
        select: {
          amountDue: true,
          amountPaid: true,
        },
      }),
    ]);

    const billed = Number(aggregate._sum.amountDue ?? 0);
    const collected = Number(aggregate._sum.amountPaid ?? 0);
    const pending = Math.max(billed - collected, 0);
    const overdue = overdueRows.reduce(
      (sum, row) => sum + Math.max(Number(row.amountDue) - Number(row.amountPaid), 0),
      0,
    );

    return {
      label: period.label,
      billed,
      collected,
      pending,
      overdue,
      collectionRate: billed > 0 ? Number(((collected / billed) * 100).toFixed(2)) : 0,
    };
  }

  private buildFeePeriodWhere(
    period: {
      year: number;
      startMonth: number;
      endMonth: number;
    },
    organizationId?: string,
  ): Prisma.FeeRecordWhereInput {
    return {
      organizationId: organizationId ?? undefined,
      year: period.year,
      month: {
        gte: period.startMonth,
        lte: period.endMonth,
      },
    };
  }

  private toUnifiedReportCard(
    student: Prisma.StudentGetPayload<{
      include: {
        studentBatches: { include: { batch: { select: { id: true; name: true; code: true } } } };
        examResults: {
          include: {
            resultItems: {
              include: {
                subject: { select: { id: true; name: true; code: true } };
                examSubject: { select: { totalMarks: true } };
              };
            };
          };
        };
        assessmentResults: {
          include: {
            assessment: { select: { id: true; subject: { select: { id: true; name: true; code: true } } } };
          };
        };
        assignmentSubmissions: {
          include: {
            assignment: { select: { id: true; subject: { select: { id: true; name: true; code: true } }; maxMarks: true } };
          };
        };
      };
    }>,
  ): UnifiedReportCard {
    type SubjectAccumulator = {
      subjectId: string;
      subjectName: string;
      subjectCode: string;
      examObtained: number;
      examTotal: number;
      assessmentObtained: number;
      assessmentTotal: number;
      assignmentObtained: number;
      assignmentTotal: number;
    };

    const subjectMap = new Map<string, SubjectAccumulator>();
    const ensureSubject = (subject: { id: string; name: string; code: string }): SubjectAccumulator => {
      const existing = subjectMap.get(subject.id);
      if (existing) {
        return existing;
      }
      const created: SubjectAccumulator = {
        subjectId: subject.id,
        subjectName: subject.name,
        subjectCode: subject.code,
        examObtained: 0,
        examTotal: 0,
        assessmentObtained: 0,
        assessmentTotal: 0,
        assignmentObtained: 0,
        assignmentTotal: 0,
      };
      subjectMap.set(subject.id, created);
      return created;
    };

    for (const result of student.examResults) {
      for (const item of result.resultItems) {
        const accumulator = ensureSubject(item.subject);
        accumulator.examObtained += Number(item.obtainedMarks);
        accumulator.examTotal += Number(item.examSubject.totalMarks);
      }
    }

    for (const result of student.assessmentResults) {
      const accumulator = ensureSubject(result.assessment.subject);
      accumulator.assessmentObtained += Number(result.obtainedMarks);
      accumulator.assessmentTotal += Number(result.totalMarks);
    }

    for (const submission of student.assignmentSubmissions) {
      const accumulator = ensureSubject(submission.assignment.subject);
      accumulator.assignmentObtained += Number(submission.awardedMarks ?? 0);
      accumulator.assignmentTotal += Number(submission.assignment.maxMarks);
    }

    const subjectBreakdown: UnifiedReportCardSubjectPoint[] = Array.from(subjectMap.values()).map((subject) => {
      const examPercentage = subject.examTotal > 0 ? Number(((subject.examObtained / subject.examTotal) * 100).toFixed(2)) : null;
      const assessmentPercentage =
        subject.assessmentTotal > 0 ? Number(((subject.assessmentObtained / subject.assessmentTotal) * 100).toFixed(2)) : null;
      const assignmentPercentage =
        subject.assignmentTotal > 0 ? Number(((subject.assignmentObtained / subject.assignmentTotal) * 100).toFixed(2)) : null;
      const totalObtained = subject.examObtained + subject.assessmentObtained + subject.assignmentObtained;
      const totalPossible = subject.examTotal + subject.assessmentTotal + subject.assignmentTotal;

      return {
        subjectId: subject.subjectId,
        subjectName: subject.subjectName,
        subjectCode: subject.subjectCode,
        examPercentage,
        assessmentPercentage,
        assignmentPercentage,
        combinedPercentage: totalPossible > 0 ? Number(((totalObtained / totalPossible) * 100).toFixed(2)) : null,
      };
    });

    const examObtained = subjectBreakdown.reduce((sum, item) => sum + (item.examPercentage ?? 0), 0);
    const examCount = subjectBreakdown.filter((item) => item.examPercentage !== null).length;
    const assessmentObtained = subjectBreakdown.reduce((sum, item) => sum + (item.assessmentPercentage ?? 0), 0);
    const assessmentCount = subjectBreakdown.filter((item) => item.assessmentPercentage !== null).length;
    const assignmentObtained = subjectBreakdown.reduce((sum, item) => sum + (item.assignmentPercentage ?? 0), 0);
    const assignmentCount = subjectBreakdown.filter((item) => item.assignmentPercentage !== null).length;

    const allComponentPercentages = [
      ...subjectBreakdown.map((item) => item.examPercentage).filter((value): value is number => value !== null),
      ...subjectBreakdown.map((item) => item.assessmentPercentage).filter((value): value is number => value !== null),
      ...subjectBreakdown.map((item) => item.assignmentPercentage).filter((value): value is number => value !== null),
    ];
    const overallPercentage = allComponentPercentages.length
      ? Number((allComponentPercentages.reduce((sum, value) => sum + value, 0) / allComponentPercentages.length).toFixed(2))
      : 0;
    const currentBatch = student.studentBatches[0]?.batch ?? null;

    return {
      studentId: student.id,
      studentName: student.fullName,
      batchId: currentBatch?.id ?? null,
      batchName: currentBatch?.name ?? 'Unassigned',
      batchCode: currentBatch?.code ?? 'UNASSIGNED',
      overallPercentage,
      overallGrade: this.toLetterGrade(overallPercentage),
      examPercentage: examCount ? Number((examObtained / examCount).toFixed(2)) : null,
      assessmentPercentage: assessmentCount ? Number((assessmentObtained / assessmentCount).toFixed(2)) : null,
      assignmentPercentage: assignmentCount ? Number((assignmentObtained / assignmentCount).toFixed(2)) : null,
      publishedExamCount: student.examResults.length,
      finalizedAssessmentCount: student.assessmentResults.length,
      reviewedAssignmentCount: student.assignmentSubmissions.length,
      subjectBreakdown,
    };
  }

  private toLetterGrade(percentage: number): string {
    if (percentage >= 85) return 'A';
    if (percentage >= 75) return 'B+';
    if (percentage >= 65) return 'B';
    if (percentage >= 55) return 'C+';
    if (percentage >= 45) return 'C';
    return 'D';
  }
}
