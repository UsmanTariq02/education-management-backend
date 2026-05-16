import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REPORT_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { ReportRepository } from './interfaces/report.repository.interface';

export interface WeeklyPrincipalSummary {
  organizationId: string | null;
  organizationName: string;
  generatedAt: string;
  headline: string;
  overview: string;
  highlights: string[];
  risks: string[];
  nextActions: string[];
}

@Injectable()
export class ReportsService {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: ReportRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getDashboardSummary(actor: CurrentUserContext) {
    return this.reportRepository.getDashboardSummary(this.resolveOrganizationId(actor));
  }

  async getTotalStudents(actor: CurrentUserContext) {
    const summary = await this.reportRepository.getDashboardSummary(this.resolveOrganizationId(actor));
    return { totalStudents: summary.totalStudents };
  }

  async getActiveStudents(actor: CurrentUserContext) {
    const summary = await this.reportRepository.getDashboardSummary(this.resolveOrganizationId(actor));
    return { activeStudents: summary.activeStudents };
  }

  async getMonthlyFeeCollection(actor: CurrentUserContext) {
    const summary = await this.reportRepository.getDashboardSummary(this.resolveOrganizationId(actor));
    return { monthlyFeeCollection: summary.monthlyFeeCollection };
  }

  async getUnpaidFeeSummary(actor: CurrentUserContext) {
    const summary = await this.reportRepository.getDashboardSummary(this.resolveOrganizationId(actor));
    return { unpaidFeeCount: summary.unpaidFeeCount };
  }

  async getAttendanceSummary(actor: CurrentUserContext) {
    const summary = await this.reportRepository.getDashboardSummary(this.resolveOrganizationId(actor));
    return { presentAttendanceCount: summary.presentAttendanceCount };
  }

  async getEnrollmentTrend(actor: CurrentUserContext) {
    return this.reportRepository.getEnrollmentTrend(12, this.resolveOrganizationId(actor));
  }

  async getFeeCollectionTrend(actor: CurrentUserContext) {
    return this.reportRepository.getFeeCollectionTrend(6, this.resolveOrganizationId(actor));
  }

  async getFeeCollectionOverview(actor: CurrentUserContext) {
    return this.reportRepository.getFeeCollectionOverview(this.resolveOrganizationId(actor));
  }

  async getFeeCollectionComparison(actor: CurrentUserContext) {
    return this.reportRepository.getFeeCollectionComparison(this.resolveOrganizationId(actor));
  }

  async getBatchCollectionSummary(actor: CurrentUserContext) {
    return this.reportRepository.getBatchCollectionSummary(this.resolveOrganizationId(actor));
  }

  async getAttendanceStatusSummary(actor: CurrentUserContext) {
    return this.reportRepository.getAttendanceStatusSummary(this.resolveOrganizationId(actor));
  }

  async getReminderChannelSummary(actor: CurrentUserContext) {
    return this.reportRepository.getReminderChannelSummary(this.resolveOrganizationId(actor));
  }

  async getStudentStatusBreakdown(actor: CurrentUserContext) {
    return this.reportRepository.getStudentStatusBreakdown(this.resolveOrganizationId(actor));
  }

  async getStudentBatchDistribution(actor: CurrentUserContext) {
    return this.reportRepository.getStudentBatchDistribution(this.resolveOrganizationId(actor));
  }

  async getBatchStatusSummary(actor: CurrentUserContext) {
    return this.reportRepository.getBatchStatusSummary(this.resolveOrganizationId(actor));
  }

  async getFeeStatusBreakdown(actor: CurrentUserContext) {
    return this.reportRepository.getFeeStatusBreakdown(this.resolveOrganizationId(actor));
  }

  async getAttendanceDailyTrend(actor: CurrentUserContext) {
    return this.reportRepository.getAttendanceDailyTrend(14, this.resolveOrganizationId(actor));
  }

  async getAttendanceBatchSummary(actor: CurrentUserContext) {
    return this.reportRepository.getAttendanceBatchSummary(this.resolveOrganizationId(actor));
  }

  async getReminderStatusBreakdown(actor: CurrentUserContext) {
    return this.reportRepository.getReminderStatusBreakdown(this.resolveOrganizationId(actor));
  }

  async getReminderDailyTrend(actor: CurrentUserContext) {
    return this.reportRepository.getReminderDailyTrend(14, this.resolveOrganizationId(actor));
  }

  async getUserRoleDistribution(actor: CurrentUserContext) {
    return this.reportRepository.getUserRoleDistribution(this.resolveOrganizationId(actor));
  }

  async getUserStatusSummary(actor: CurrentUserContext) {
    return this.reportRepository.getUserStatusSummary(this.resolveOrganizationId(actor));
  }

  async getAcademicDashboardSummary(actor: CurrentUserContext) {
    return this.reportRepository.getAcademicDashboardSummary(this.resolveOrganizationId(actor));
  }

  async getUnifiedReportCards(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.reportRepository.getUnifiedReportCards(query, this.resolveOrganizationId(actor));
  }

  async getGradeDistribution(actor: CurrentUserContext) {
    return this.reportRepository.getGradeDistribution(this.resolveOrganizationId(actor));
  }

  async getExamScheduleTrend(actor: CurrentUserContext) {
    return this.reportRepository.getExamScheduleTrend(12, this.resolveOrganizationId(actor));
  }

  async getBatchPerformance(actor: CurrentUserContext) {
    return this.reportRepository.getBatchPerformance(this.resolveOrganizationId(actor));
  }

  async getResultStatusSummary(actor: CurrentUserContext) {
    return this.reportRepository.getResultStatusSummary(this.resolveOrganizationId(actor));
  }

  async getWeeklyPrincipalSummary(actor: CurrentUserContext): Promise<WeeklyPrincipalSummary> {
    const organizationId = this.resolveOrganizationId(actor);
    const summary = await this.generateWeeklyPrincipalSummary(organizationId, actor.organizationName ?? 'Current organization');

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'reports',
      action: 'weekly-principal-summary',
      metadata: {
        organizationId: summary.organizationId,
        organizationName: summary.organizationName,
        headline: summary.headline,
      },
    });

    return summary;
  }

  async generateWeeklyPrincipalSummary(organizationId?: string, organizationName?: string): Promise<WeeklyPrincipalSummary> {
    const [dashboardSummary, feeOverview, attendanceDailyTrend, reminderStatusSummary, academicSummary, enrollmentTrend] =
      await Promise.all([
        this.reportRepository.getDashboardSummary(organizationId),
        this.reportRepository.getFeeCollectionOverview(organizationId),
        this.reportRepository.getAttendanceDailyTrend(7, organizationId),
        this.reportRepository.getReminderStatusBreakdown(organizationId),
        this.reportRepository.getAcademicDashboardSummary(organizationId),
        this.reportRepository.getEnrollmentTrend(3, organizationId),
      ]);

    const recentAttendance = attendanceDailyTrend.slice(-7);
    const attendanceAbsent = recentAttendance.reduce((sum, item) => sum + item.absent, 0);
    const attendanceLate = recentAttendance.reduce((sum, item) => sum + item.late, 0);
    const reminderFailed = reminderStatusSummary.find((item) => item.status === 'FAILED')?.total ?? 0;
    const reminderSent = reminderStatusSummary.find((item) => item.status === 'SENT')?.total ?? 0;
    const overdueBalance = feeOverview.currentMonth.overdue;
    const pendingBalance = feeOverview.currentMonth.pending;
    const enrollmentDelta =
      enrollmentTrend.length >= 2 ? enrollmentTrend[enrollmentTrend.length - 1].count - enrollmentTrend[0].count : 0;

    const headline =
      overdueBalance > pendingBalance
        ? 'Fee recovery needs immediate attention'
        : attendanceAbsent + attendanceLate > 0
          ? 'Attendance follow-up requires staff attention'
          : 'Operations are stable and ready for the next cycle';

    const overview = [
      `${dashboardSummary.totalStudents} students tracked with ${dashboardSummary.activeStudents} active learners in scope.`,
      `${dashboardSummary.unpaidFeeCount} fee records remain unpaid and current month overdue exposure is ${overdueBalance.toFixed(2)}.`,
      `${attendanceAbsent} absent marks and ${attendanceLate} late marks were recorded in the recent attendance window.`,
      `${reminderSent} reminders were sent and ${reminderFailed} reminder deliveries failed in the latest summary.`,
      academicSummary.totalResults > 0
        ? `Academic average stands at ${academicSummary.averagePercentage.toFixed(1)}% across published results.`
        : 'No published academic results are available yet for this summary.',
    ].join(' ');

    const highlights = [
      `Monthly fee collection: ${dashboardSummary.monthlyFeeCollection.toFixed(2)}`,
      `Recent enrollment change: ${enrollmentDelta >= 0 ? '+' : ''}${enrollmentDelta} students over the last few months`,
      `Reminder volume: ${reminderSent} sent, ${reminderFailed} failed`,
    ];

    const risks = [
      overdueBalance > 0
        ? `${overdueBalance.toFixed(2)} remains overdue and should be escalated.`
        : 'No overdue fee balance is visible in the current month.',
      attendanceAbsent + attendanceLate > 0
        ? `${attendanceAbsent + attendanceLate} attendance exceptions need follow-up.`
        : 'Attendance looks clean in the recent window.',
    ];

    const nextActions = [
      overdueBalance > 0 ? 'Run fee follow-up and escalation workflows for overdue records.' : 'Keep watching fee records for new pending balances.',
      attendanceAbsent + attendanceLate > 0 ? 'Review chronic attendance exceptions and contact guardians.' : 'Maintain attendance monitoring and only intervene on new exceptions.',
      reminderFailed > 0 ? 'Inspect failed reminders and delivery settings.' : 'Use the reminder queue to keep communications moving.',
    ];

    return {
      organizationId: organizationId ?? null,
      organizationName: organizationName ?? 'Platform scope',
      generatedAt: new Date().toISOString(),
      headline,
      overview,
      highlights,
      risks,
      nextActions,
    };
  }

  private resolveOrganizationId(actor: CurrentUserContext): string | undefined {
    if (actor.roles.includes('SUPER_ADMIN')) {
      return undefined;
    }

    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }

    return actor.organizationId;
  }
}
