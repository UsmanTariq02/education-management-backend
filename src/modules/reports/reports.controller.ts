import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller({ path: 'reports', version: '1' })
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('summary')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get dashboard summary report' })
  async summary(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getDashboardSummary(actor);
  }

  @Get('students/total')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get total students report' })
  async totalStudents(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getTotalStudents(actor);
  }

  @Get('students/active')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get active students report' })
  async activeStudents(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getActiveStudents(actor);
  }

  @Get('fees/monthly-collection')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get monthly fee collection report' })
  async monthlyFeeCollection(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getMonthlyFeeCollection(actor);
  }

  @Get('fees/unpaid')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get unpaid fee summary report' })
  async unpaidFees(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getUnpaidFeeSummary(actor);
  }

  @Get('attendance/summary')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get attendance summary report' })
  async attendanceSummary(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getAttendanceSummary(actor);
  }

  @Get('students/enrollment-trend')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get monthly student enrollment trend for charts' })
  async enrollmentTrend(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getEnrollmentTrend(actor);
  }

  @Get('fees/collection-trend')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get monthly fee collection trend for charts' })
  async feeCollectionTrend(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getFeeCollectionTrend(actor);
  }

  @Get('fees/collection-overview')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get fee collection overview for current month, quarter, and year' })
  async feeCollectionOverview(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getFeeCollectionOverview(actor);
  }

  @Get('fees/period-comparison')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get current vs previous collection and pending comparison for month, quarter, and year' })
  async feePeriodComparison(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getFeeCollectionComparison(actor);
  }

  @Get('fees/batch-collection')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get batch-wise fee collection summary for charts' })
  async batchCollection(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getBatchCollectionSummary(actor);
  }

  @Get('attendance/status-breakdown')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get attendance status breakdown for charts' })
  async attendanceStatusBreakdown(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getAttendanceStatusSummary(actor);
  }

  @Get('reminders/channel-breakdown')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get reminder channel breakdown for charts' })
  async reminderChannelBreakdown(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getReminderChannelSummary(actor);
  }

  @Get('students/status-breakdown')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get student status breakdown for charts' })
  async studentStatusBreakdown(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getStudentStatusBreakdown(actor);
  }

  @Get('students/batch-distribution')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get student distribution by batch for charts' })
  async studentBatchDistribution(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getStudentBatchDistribution(actor);
  }

  @Get('users/role-distribution')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get user role distribution for charts' })
  async userRoleDistribution(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getUserRoleDistribution(actor);
  }

  @Get('users/status-summary')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get user active status summary for charts' })
  async userStatusSummary(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getUserStatusSummary(actor);
  }

  @Get('batches/status-summary')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get batch status summary for charts' })
  async batchStatusSummary(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getBatchStatusSummary(actor);
  }

  @Get('fees/status-breakdown')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get fee status breakdown for charts' })
  async feeStatusBreakdown(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getFeeStatusBreakdown(actor);
  }

  @Get('attendance/daily-trend')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get attendance daily trend for charts' })
  async attendanceDailyTrend(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getAttendanceDailyTrend(actor);
  }

  @Get('attendance/batch-summary')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get attendance by batch summary for charts' })
  async attendanceBatchSummary(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getAttendanceBatchSummary(actor);
  }

  @Get('reminders/status-breakdown')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get reminder status breakdown for charts' })
  async reminderStatusBreakdown(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getReminderStatusBreakdown(actor);
  }

  @Get('reminders/daily-trend')
  @Permissions('reports.read')
  @ApiOperation({ summary: 'Get reminder daily trend for charts' })
  async reminderDailyTrend(@CurrentUser() actor: CurrentUserContext) {
    return this.reportsService.getReminderDailyTrend(actor);
  }
}
