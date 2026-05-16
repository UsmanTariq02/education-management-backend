import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AttendanceStatus, ReminderChannel, ReminderStatus } from '@prisma/client';
import { REMINDER_REPOSITORY } from '../../common/constants/injection-tokens';
import { AuditLogService } from '../../common/services/audit-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ReminderRepository } from '../reminders/interfaces/reminder.repository.interface';

const FOLLOW_UP_WINDOW_DAYS = 7;
const DUPLICATE_SUPPRESSION_DAYS = 3;
const ABSENT_THRESHOLD = 2;
const LATE_THRESHOLD = 3;
const TOTAL_THRESHOLD = 4;
const REMINDER_MARKER = '[ATTENDANCE-FOLLOW-UP]';

export interface AttendanceFollowUpOrganizationSummary {
  organizationId: string;
  organizationName: string;
  candidateStudents: number;
  remindersCreated: number;
  remindersSkipped: number;
}

export interface AttendanceFollowUpAutomationSummary {
  processedOrganizations: number;
  candidateStudents: number;
  remindersCreated: number;
  remindersSkipped: number;
  organizations: AttendanceFollowUpOrganizationSummary[];
}

type AttendanceFollowUpCandidate = {
  studentId: string;
  student: {
    id: string;
    fullName: string;
    guardianName: string;
    guardianEmail: string | null;
    guardianPhone: string;
    phone: string;
  };
  records: Array<{
    attendanceDate: Date;
    status: AttendanceStatus;
    batch: { name: string };
  }>;
};

@Injectable()
export class AttendanceAlertAutomationService {
  private readonly logger = new Logger(AttendanceAlertAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REMINDER_REPOSITORY)
    private readonly reminderRepository: ReminderRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async runScheduledFollowUps(): Promise<void> {
    const summary = await this.processFollowUps();
    this.logger.log(
      `Attendance follow-up automation processed ${summary.processedOrganizations} organizations, created ${summary.remindersCreated} reminders, skipped ${summary.remindersSkipped} duplicates`,
    );
  }

  async processFollowUps(organizationId?: string, triggeredByUserId?: string): Promise<AttendanceFollowUpAutomationSummary> {
    const organizations = await this.prisma.organization.findMany({
      where: organizationId ? { id: organizationId } : undefined,
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    const summary: AttendanceFollowUpAutomationSummary = {
      processedOrganizations: 0,
      candidateStudents: 0,
      remindersCreated: 0,
      remindersSkipped: 0,
      organizations: [],
    };

    for (const organization of organizations) {
      const organizationSummary = await this.processOrganization(organization.id, organization.name, triggeredByUserId);
      summary.processedOrganizations += 1;
      summary.candidateStudents += organizationSummary.candidateStudents;
      summary.remindersCreated += organizationSummary.remindersCreated;
      summary.remindersSkipped += organizationSummary.remindersSkipped;
      summary.organizations.push(organizationSummary);
    }

    return summary;
  }

  private async processOrganization(
    organizationId: string,
    organizationName: string,
    triggeredByUserId?: string,
  ): Promise<AttendanceFollowUpOrganizationSummary> {
    const now = new Date();
    const windowStart = this.shiftDate(now, -FOLLOW_UP_WINDOW_DAYS);
    const duplicateSuppressionStart = this.shiftDate(now, -DUPLICATE_SUPPRESSION_DAYS);

    const records = await this.prisma.attendance.findMany({
      where: {
        organizationId,
        attendanceDate: {
          gte: windowStart,
          lte: now,
        },
        status: {
          in: [AttendanceStatus.ABSENT, AttendanceStatus.LATE],
        },
      },
      select: {
        studentId: true,
        attendanceDate: true,
        status: true,
        student: {
          select: {
            id: true,
            fullName: true,
            guardianName: true,
            guardianEmail: true,
            guardianPhone: true,
            phone: true,
          },
        },
        batch: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { studentId: 'asc' },
        { attendanceDate: 'desc' },
      ],
    });

    const candidates = this.groupCandidates(records);
    let candidateStudents = 0;
    let remindersCreated = 0;
    let remindersSkipped = 0;

    for (const candidate of candidates) {
      if (!this.shouldTriggerFollowUp(candidate.records)) {
        continue;
      }

      candidateStudents += 1;

      const existingReminder = await this.prisma.reminderLog.findFirst({
        where: {
          organizationId,
          studentId: candidate.studentId,
          channel: ReminderChannel.MANUAL,
          createdAt: {
            gte: duplicateSuppressionStart,
          },
          message: {
            contains: REMINDER_MARKER,
          },
        },
        select: {
          id: true,
        },
      });

      if (existingReminder) {
        remindersSkipped += 1;
        continue;
      }

      const message = this.buildReminderMessage(candidate, organizationName, windowStart, now);

      await this.reminderRepository.create(
        {
          studentId: candidate.studentId,
          channel: ReminderChannel.MANUAL,
          message,
          status: ReminderStatus.SENT,
        },
        triggeredByUserId,
        organizationId,
        {
          status: ReminderStatus.SENT,
          sentAt: now,
          externalReference: `attendance-follow-up-${candidate.studentId}-${windowStart.toISOString().slice(0, 10)}`,
        },
      );

      remindersCreated += 1;
    }

    if (candidateStudents > 0 || remindersCreated > 0 || remindersSkipped > 0) {
      await this.auditLogService.log({
        actorUserId: triggeredByUserId,
        module: 'attendance',
        action: 'automation-follow-up',
        metadata: {
          organizationId,
          organizationName,
          windowDays: FOLLOW_UP_WINDOW_DAYS,
          candidateStudents,
          remindersCreated,
          remindersSkipped,
        },
      });
    }

    return {
      organizationId,
      organizationName,
      candidateStudents,
      remindersCreated,
      remindersSkipped,
    };
  }

  private groupCandidates(records: Array<{
    studentId: string;
    attendanceDate: Date;
    status: AttendanceStatus;
    student: {
      id: string;
      fullName: string;
      guardianName: string;
      guardianEmail: string | null;
      guardianPhone: string;
      phone: string;
    };
    batch: { name: string };
  }>): AttendanceFollowUpCandidate[] {
    const grouped = new Map<string, AttendanceFollowUpCandidate>();

    for (const record of records) {
      const existing = grouped.get(record.studentId);
      if (existing) {
        existing.records.push({
          attendanceDate: record.attendanceDate,
          status: record.status,
          batch: record.batch,
        });
        continue;
      }

      grouped.set(record.studentId, {
        studentId: record.studentId,
        student: record.student,
        records: [
          {
            attendanceDate: record.attendanceDate,
            status: record.status,
            batch: record.batch,
          },
        ],
      });
    }

    return Array.from(grouped.values());
  }

  private shouldTriggerFollowUp(records: AttendanceFollowUpCandidate['records']): boolean {
    const absentCount = records.filter((record) => record.status === AttendanceStatus.ABSENT).length;
    const lateCount = records.filter((record) => record.status === AttendanceStatus.LATE).length;
    const totalConcernCount = absentCount + lateCount;

    return absentCount >= ABSENT_THRESHOLD || lateCount >= LATE_THRESHOLD || totalConcernCount >= TOTAL_THRESHOLD;
  }

  private buildReminderMessage(
    candidate: AttendanceFollowUpCandidate,
    organizationName: string,
    windowStart: Date,
    now: Date,
  ): string {
    const absentCount = candidate.records.filter((record) => record.status === AttendanceStatus.ABSENT).length;
    const lateCount = candidate.records.filter((record) => record.status === AttendanceStatus.LATE).length;
    const recentDates = Array.from(new Set(candidate.records.map((record) => this.formatDate(record.attendanceDate)))).slice(0, 4);
    const batchNames = Array.from(new Set(candidate.records.map((record) => record.batch.name))).slice(0, 3);

    return [
      REMINDER_MARKER,
      `Attendance follow-up for ${candidate.student.fullName} at ${organizationName}.`,
      `Window: ${this.formatDate(windowStart)} to ${this.formatDate(now)}.`,
      `Absent marks: ${absentCount}. Late marks: ${lateCount}.`,
      recentDates.length > 0 ? `Recent dates: ${recentDates.join(', ')}.` : null,
      batchNames.length > 0 ? `Batches: ${batchNames.join(', ')}.` : null,
      `Guardian: ${candidate.student.guardianName}.`,
      'Please review the attendance pattern and contact the school office if follow-up is required.',
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n');
  }

  private shiftDate(date: Date, deltaDays: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + deltaDays);
    next.setHours(0, 0, 0, 0);
    return next;
  }

  private formatDate(date: Date): string {
    return date.toISOString().slice(0, 10);
  }
}
