import { Test } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

describe('ReportsController', () => {
  let controller: ReportsController;
  let service: jest.Mocked<ReportsService>;
  const actor = {
    userId: '1',
    email: 'admin@edu.local',
    organizationId: 'org-1',
    organizationName: 'Default Academy',
    roles: ['ADMIN'],
    permissions: ['reports.read'],
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [
        {
          provide: ReportsService,
          useValue: {
            getDashboardSummary: jest.fn(),
            getTotalStudents: jest.fn(),
            getActiveStudents: jest.fn(),
            getEnrollmentTrend: jest.fn(),
            getStudentStatusBreakdown: jest.fn(),
            getStudentBatchDistribution: jest.fn(),
            getUserRoleDistribution: jest.fn(),
            getUserStatusSummary: jest.fn(),
            getBatchStatusSummary: jest.fn(),
            getMonthlyFeeCollection: jest.fn(),
            getFeeCollectionTrend: jest.fn(),
            getBatchCollectionSummary: jest.fn(),
            getFeeStatusBreakdown: jest.fn(),
            getUnpaidFeeSummary: jest.fn(),
            getAttendanceSummary: jest.fn(),
            getAttendanceStatusSummary: jest.fn(),
            getAttendanceDailyTrend: jest.fn(),
            getAttendanceBatchSummary: jest.fn(),
            getReminderChannelSummary: jest.fn(),
            getReminderStatusBreakdown: jest.fn(),
            getReminderDailyTrend: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = moduleRef.get(ReportsController);
    service = moduleRef.get(ReportsService);
  });

  it('summary should delegate to service', async () => {
    const expected = {
      totalStudents: 100,
      activeStudents: 90,
      monthlyFeeCollection: 50000,
      unpaidFeeCount: 10,
      presentAttendanceCount: 80,
    };
    service.getDashboardSummary.mockResolvedValue(expected);

    await expect(controller.summary(actor)).resolves.toEqual(expected);
    expect(service.getDashboardSummary).toHaveBeenCalledWith(actor);
  });

  it('totalStudents should delegate to service', async () => {
    const expected = { totalStudents: 100 };
    service.getTotalStudents.mockResolvedValue(expected);

    await expect(controller.totalStudents(actor)).resolves.toEqual(expected);
    expect(service.getTotalStudents).toHaveBeenCalledWith(actor);
  });

  it('activeStudents should delegate to service', async () => {
    const expected = { activeStudents: 90 };
    service.getActiveStudents.mockResolvedValue(expected);

    await expect(controller.activeStudents(actor)).resolves.toEqual(expected);
    expect(service.getActiveStudents).toHaveBeenCalledWith(actor);
  });

  it('monthlyFeeCollection should delegate to service', async () => {
    const expected = { monthlyFeeCollection: 50000 };
    service.getMonthlyFeeCollection.mockResolvedValue(expected);

    await expect(controller.monthlyFeeCollection(actor)).resolves.toEqual(expected);
    expect(service.getMonthlyFeeCollection).toHaveBeenCalledWith(actor);
  });

  it('enrollmentTrend should delegate to service', async () => {
    const expected = [{ month: '2026-03', count: 12 }];
    service.getEnrollmentTrend.mockResolvedValue(expected);

    await expect(controller.enrollmentTrend(actor)).resolves.toEqual(expected);
    expect(service.getEnrollmentTrend).toHaveBeenCalledWith(actor);
  });

  it('feeCollectionTrend should delegate to service', async () => {
    const expected = [{ month: '2026-03', collected: 50000 }];
    service.getFeeCollectionTrend.mockResolvedValue(expected);

    await expect(controller.feeCollectionTrend(actor)).resolves.toEqual(expected);
    expect(service.getFeeCollectionTrend).toHaveBeenCalledWith(actor);
  });

  it('studentStatusBreakdown should delegate to service', async () => {
    const expected = [{ status: 'ACTIVE', total: 42 }];
    service.getStudentStatusBreakdown.mockResolvedValue(expected);

    await expect(controller.studentStatusBreakdown(actor)).resolves.toEqual(expected);
    expect(service.getStudentStatusBreakdown).toHaveBeenCalledWith(actor);
  });

  it('studentBatchDistribution should delegate to service', async () => {
    const expected = [{ batchId: 'batch-1', batchName: 'Batch A', batchCode: 'BA-1', total: 30 }];
    service.getStudentBatchDistribution.mockResolvedValue(expected);

    await expect(controller.studentBatchDistribution(actor)).resolves.toEqual(expected);
    expect(service.getStudentBatchDistribution).toHaveBeenCalledWith(actor);
  });

  it('userRoleDistribution should delegate to service', async () => {
    const expected = [{ roleId: 'role-1', roleName: 'ADMIN', total: 6 }];
    service.getUserRoleDistribution.mockResolvedValue(expected);

    await expect(controller.userRoleDistribution(actor)).resolves.toEqual(expected);
    expect(service.getUserRoleDistribution).toHaveBeenCalledWith(actor);
  });

  it('userStatusSummary should delegate to service', async () => {
    const expected = [{ status: 'ACTIVE', total: 8 }];
    service.getUserStatusSummary.mockResolvedValue(expected);

    await expect(controller.userStatusSummary(actor)).resolves.toEqual(expected);
    expect(service.getUserStatusSummary).toHaveBeenCalledWith(actor);
  });

  it('batchStatusSummary should delegate to service', async () => {
    const expected = [{ status: 'ACTIVE', total: 5 }];
    service.getBatchStatusSummary.mockResolvedValue(expected);

    await expect(controller.batchStatusSummary(actor)).resolves.toEqual(expected);
    expect(service.getBatchStatusSummary).toHaveBeenCalledWith(actor);
  });

  it('batchCollection should delegate to service', async () => {
    const expected = [{ batchId: 'batch-1', batchName: 'Batch A', batchCode: 'BA-1', total: 15000 }];
    service.getBatchCollectionSummary.mockResolvedValue(expected);

    await expect(controller.batchCollection(actor)).resolves.toEqual(expected);
    expect(service.getBatchCollectionSummary).toHaveBeenCalledWith(actor);
  });

  it('feeStatusBreakdown should delegate to service', async () => {
    const expected = [{ status: 'PAID', total: 20 }];
    service.getFeeStatusBreakdown.mockResolvedValue(expected);

    await expect(controller.feeStatusBreakdown(actor)).resolves.toEqual(expected);
    expect(service.getFeeStatusBreakdown).toHaveBeenCalledWith(actor);
  });

  it('unpaidFees should delegate to service', async () => {
    const expected = { unpaidFeeCount: 10 };
    service.getUnpaidFeeSummary.mockResolvedValue(expected);

    await expect(controller.unpaidFees(actor)).resolves.toEqual(expected);
    expect(service.getUnpaidFeeSummary).toHaveBeenCalledWith(actor);
  });

  it('attendanceSummary should delegate to service', async () => {
    const expected = { presentAttendanceCount: 80 };
    service.getAttendanceSummary.mockResolvedValue(expected);

    await expect(controller.attendanceSummary(actor)).resolves.toEqual(expected);
    expect(service.getAttendanceSummary).toHaveBeenCalledWith(actor);
  });

  it('attendanceStatusBreakdown should delegate to service', async () => {
    const expected = [{ status: 'PRESENT', total: 80 }];
    service.getAttendanceStatusSummary.mockResolvedValue(expected);

    await expect(controller.attendanceStatusBreakdown(actor)).resolves.toEqual(expected);
    expect(service.getAttendanceStatusSummary).toHaveBeenCalledWith(actor);
  });

  it('attendanceDailyTrend should delegate to service', async () => {
    const expected = [{ date: '2026-03-18', present: 20, absent: 2, late: 1, leave: 0 }];
    service.getAttendanceDailyTrend.mockResolvedValue(expected);

    await expect(controller.attendanceDailyTrend(actor)).resolves.toEqual(expected);
    expect(service.getAttendanceDailyTrend).toHaveBeenCalledWith(actor);
  });

  it('attendanceBatchSummary should delegate to service', async () => {
    const expected = [{ batchId: 'batch-1', batchName: 'Batch A', batchCode: 'BA-1', total: 70 }];
    service.getAttendanceBatchSummary.mockResolvedValue(expected);

    await expect(controller.attendanceBatchSummary(actor)).resolves.toEqual(expected);
    expect(service.getAttendanceBatchSummary).toHaveBeenCalledWith(actor);
  });

  it('reminderChannelBreakdown should delegate to service', async () => {
    const expected = [{ channel: 'EMAIL', count: 14 }];
    service.getReminderChannelSummary.mockResolvedValue(expected);

    await expect(controller.reminderChannelBreakdown(actor)).resolves.toEqual(expected);
    expect(service.getReminderChannelSummary).toHaveBeenCalledWith(actor);
  });

  it('reminderStatusBreakdown should delegate to service', async () => {
    const expected = [{ status: 'SENT', total: 14 }];
    service.getReminderStatusBreakdown.mockResolvedValue(expected);

    await expect(controller.reminderStatusBreakdown(actor)).resolves.toEqual(expected);
    expect(service.getReminderStatusBreakdown).toHaveBeenCalledWith(actor);
  });

  it('reminderDailyTrend should delegate to service', async () => {
    const expected = [{ date: '2026-03-18', total: 7 }];
    service.getReminderDailyTrend.mockResolvedValue(expected);

    await expect(controller.reminderDailyTrend(actor)).resolves.toEqual(expected);
    expect(service.getReminderDailyTrend).toHaveBeenCalledWith(actor);
  });
});
