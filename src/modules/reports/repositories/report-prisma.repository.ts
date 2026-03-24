import { Injectable } from '@nestjs/common';
import { AttendanceStatus, FeeRecordStatus, StudentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  AttendanceBatchPoint,
  AttendanceDailyTrendPoint,
  BatchCollectionPoint,
  BatchStatusPoint,
  FeeCollectionTrendPoint,
  FeeStatusPoint,
  ReminderDailyTrendPoint,
  ReminderChannelPoint,
  ReportRepository,
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
}
