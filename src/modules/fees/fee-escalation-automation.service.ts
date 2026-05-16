import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FeeRecordStatus } from '@prisma/client';
import { AuditLogService } from '../../common/services/audit-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RemindersService } from '../reminders/reminders.service';

const ESCALATION_WINDOW_DAYS = 7;
const DUPLICATE_SUPPRESSION_DAYS = 3;
const REMINDER_MARKER = '[FEE-ESCALATION]';
const MANUAL_AUTOMATION_USER_ID = 'system-automation';

export interface FeeEscalationOrganizationSummary {
  organizationId: string;
  organizationName: string;
  candidateRecords: number;
  remindersCreated: number;
  remindersSkipped: number;
}

export interface FeeEscalationAutomationSummary {
  processedOrganizations: number;
  candidateRecords: number;
  remindersCreated: number;
  remindersSkipped: number;
  organizations: FeeEscalationOrganizationSummary[];
}

type FeeEscalationCandidate = {
  id: string;
  studentId: string;
  month: number;
  year: number;
  status: FeeRecordStatus;
  amountDue: string;
  amountPaid: string;
  student: {
    fullName: string;
    guardianName: string;
    guardianEmail: string | null;
    guardianPhone: string;
    phone: string;
  };
  feePlan: {
    dueDay: number;
  };
};

@Injectable()
export class FeeEscalationAutomationService {
  private readonly logger = new Logger(FeeEscalationAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly remindersService: RemindersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async runScheduledEscalations(): Promise<void> {
    const summary = await this.processEscalations();
    this.logger.log(
      `Fee escalation automation processed ${summary.processedOrganizations} organizations, created ${summary.remindersCreated} reminders, skipped ${summary.remindersSkipped} duplicates`,
    );
  }

  async processEscalations(organizationId?: string, triggeredByUserId?: string): Promise<FeeEscalationAutomationSummary> {
    const organizations = await this.prisma.organization.findMany({
      where: organizationId ? { id: organizationId } : undefined,
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    const summary: FeeEscalationAutomationSummary = {
      processedOrganizations: 0,
      candidateRecords: 0,
      remindersCreated: 0,
      remindersSkipped: 0,
      organizations: [],
    };

    for (const organization of organizations) {
      const organizationSummary = await this.processOrganization(organization.id, organization.name, triggeredByUserId);
      summary.processedOrganizations += 1;
      summary.candidateRecords += organizationSummary.candidateRecords;
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
  ): Promise<FeeEscalationOrganizationSummary> {
    const now = new Date();
    const duplicateSuppressionStart = this.shiftDate(now, -DUPLICATE_SUPPRESSION_DAYS);
    const windowStart = this.shiftDate(now, -ESCALATION_WINDOW_DAYS);

    const feeRecords = await this.prisma.feeRecord.findMany({
      where: {
        organizationId,
        status: {
          in: [FeeRecordStatus.PENDING, FeeRecordStatus.PARTIAL, FeeRecordStatus.OVERDUE],
        },
      },
      select: {
        id: true,
        studentId: true,
        month: true,
        year: true,
        status: true,
        amountDue: true,
        amountPaid: true,
        student: {
          select: {
            fullName: true,
            guardianName: true,
            guardianEmail: true,
            guardianPhone: true,
            phone: true,
          },
        },
        feePlan: {
          select: {
            dueDay: true,
          },
        },
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    const candidates = feeRecords
      .map((record) => ({
        id: record.id,
        studentId: record.studentId,
        month: record.month,
        year: record.year,
        status: record.status,
        amountDue: record.amountDue.toString(),
        amountPaid: record.amountPaid.toString(),
        student: record.student,
        feePlan: record.feePlan,
      }))
      .filter((record) => this.isEscalationDue(record, now));

    let candidateRecords = 0;
    let remindersCreated = 0;
    let remindersSkipped = 0;

    for (const record of candidates) {
      candidateRecords += 1;

      const existingReminder = await this.prisma.reminderLog.findFirst({
        where: {
          organizationId,
          feeRecordId: record.id,
          createdAt: {
            gte: duplicateSuppressionStart,
          },
          message: {
            contains: REMINDER_MARKER,
          },
        },
        select: { id: true },
      });

      if (existingReminder) {
        remindersSkipped += 1;
        continue;
      }

      const message = this.buildReminderMessage(record, organizationName, windowStart, now);
      const actor = this.createAutomationActor(organizationId, triggeredByUserId);

      await this.remindersService.create(
        {
          studentId: record.studentId,
          feeRecordId: record.id,
          channel: 'MANUAL',
          message,
          status: 'SENT',
        },
        actor,
      );

      remindersCreated += 1;
    }

    if (candidateRecords > 0 || remindersCreated > 0 || remindersSkipped > 0) {
      await this.auditLogService.log({
        actorUserId: triggeredByUserId ?? MANUAL_AUTOMATION_USER_ID,
        module: 'fees',
        action: 'automation-escalation',
        metadata: {
          organizationId,
          organizationName,
          windowDays: ESCALATION_WINDOW_DAYS,
          candidateRecords,
          remindersCreated,
          remindersSkipped,
        },
      });
    }

    return {
      organizationId,
      organizationName,
      candidateRecords,
      remindersCreated,
      remindersSkipped,
    };
  }

  private isEscalationDue(
    record: {
      month: number;
      year: number;
      status: FeeRecordStatus;
      amountDue: string;
      amountPaid: string;
      feePlan: { dueDay: number };
    },
    now: Date,
  ): boolean {
    const amountDue = Number(record.amountDue);
    const amountPaid = Number(record.amountPaid);
    const balance = amountDue - amountPaid;
    if (balance <= 0) {
      return false;
    }

    const dueDate = new Date(record.year, record.month - 1, record.feePlan.dueDay, 9, 0, 0);
    return dueDate.getTime() <= now.getTime();
  }

  private buildReminderMessage(
    record: FeeEscalationCandidate,
    organizationName: string,
    windowStart: Date,
    now: Date,
  ): string {
    const amountDue = Number(record.amountDue);
    const amountPaid = Number(record.amountPaid);
    const balance = Math.max(amountDue - amountPaid, 0);
    const dueDate = new Date(record.year, record.month - 1, record.feePlan.dueDay, 9, 0, 0);
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));

    return [
      REMINDER_MARKER,
      `Fee escalation for ${record.student.fullName} at ${organizationName}.`,
      `Billing cycle: ${record.month}/${record.year}.`,
      `Due date: ${this.formatDate(dueDate)}.`,
      `Status: ${record.status}.`,
      `Amount due: ${amountDue.toFixed(2)}.`,
      `Amount paid: ${amountPaid.toFixed(2)}.`,
      `Pending balance: ${balance.toFixed(2)}.`,
      `Days overdue: ${daysOverdue}.`,
      `Escalation window: ${this.formatDate(windowStart)} to ${this.formatDate(now)}.`,
      `Guardian: ${record.student.guardianName}.`,
      'Please review the outstanding balance and continue follow-up with the family.',
    ].join('\n');
  }

  private createAutomationActor(organizationId: string, triggeredByUserId?: string) {
    return {
      userId: triggeredByUserId ?? MANUAL_AUTOMATION_USER_ID,
      email: 'system-automation@local',
      organizationId,
      organizationName: 'Automation',
      roles: ['ADMIN'],
      permissions: [],
    };
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
