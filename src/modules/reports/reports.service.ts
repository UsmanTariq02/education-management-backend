import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { REPORT_REPOSITORY } from '../../common/constants/injection-tokens';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { ReportRepository } from './interfaces/report.repository.interface';

@Injectable()
export class ReportsService {
  constructor(
    @Inject(REPORT_REPOSITORY)
    private readonly reportRepository: ReportRepository,
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
