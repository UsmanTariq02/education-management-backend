import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { CurrentPortalUserContext } from '../../common/interfaces/current-portal-user.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { PortalDashboardDto } from './dto/portal-dashboard.dto';

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

    const [feeRecords, attendanceRecords, reminderLogs, examResults, timetableEntries] = await Promise.all([
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
      },
    };
  }
}
