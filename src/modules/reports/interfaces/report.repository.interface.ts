export interface EnrollmentTrendPoint {
  month: string;
  count: number;
}

export interface FeeCollectionTrendPoint {
  month: string;
  collected: number;
}

export interface BatchCollectionPoint {
  batchId: string | null;
  batchName: string;
  batchCode: string;
  total: number;
}

export interface AttendanceStatusPoint {
  status: string;
  total: number;
}

export interface ReminderChannelPoint {
  channel: string;
  count: number;
}

export interface StudentStatusPoint {
  status: string;
  total: number;
}

export interface StudentBatchDistributionPoint {
  batchId: string;
  batchName: string;
  batchCode: string;
  total: number;
}

export interface BatchStatusPoint {
  status: string;
  total: number;
}

export interface FeeStatusPoint {
  status: string;
  total: number;
}

export interface AttendanceDailyTrendPoint {
  date: string;
  present: number;
  absent: number;
  late: number;
  leave: number;
}

export interface AttendanceBatchPoint {
  batchId: string;
  batchName: string;
  batchCode: string;
  total: number;
}

export interface ReminderStatusPoint {
  status: string;
  total: number;
}

export interface ReminderDailyTrendPoint {
  date: string;
  total: number;
}

export interface UserRoleDistributionPoint {
  roleId: string;
  roleName: string;
  total: number;
}

export interface UserStatusPoint {
  status: string;
  total: number;
}

export interface ReportRepository {
  getDashboardSummary(organizationId?: string): Promise<{
    totalStudents: number;
    activeStudents: number;
    monthlyFeeCollection: number;
    unpaidFeeCount: number;
    presentAttendanceCount: number;
  }>;
  getEnrollmentTrend(limit: number, organizationId?: string): Promise<EnrollmentTrendPoint[]>;
  getFeeCollectionTrend(limit: number, organizationId?: string): Promise<FeeCollectionTrendPoint[]>;
  getBatchCollectionSummary(organizationId?: string): Promise<BatchCollectionPoint[]>;
  getAttendanceStatusSummary(organizationId?: string): Promise<AttendanceStatusPoint[]>;
  getReminderChannelSummary(organizationId?: string): Promise<ReminderChannelPoint[]>;
  getStudentStatusBreakdown(organizationId?: string): Promise<StudentStatusPoint[]>;
  getStudentBatchDistribution(organizationId?: string): Promise<StudentBatchDistributionPoint[]>;
  getBatchStatusSummary(organizationId?: string): Promise<BatchStatusPoint[]>;
  getFeeStatusBreakdown(organizationId?: string): Promise<FeeStatusPoint[]>;
  getAttendanceDailyTrend(limit: number, organizationId?: string): Promise<AttendanceDailyTrendPoint[]>;
  getAttendanceBatchSummary(organizationId?: string): Promise<AttendanceBatchPoint[]>;
  getReminderStatusBreakdown(organizationId?: string): Promise<ReminderStatusPoint[]>;
  getReminderDailyTrend(limit: number, organizationId?: string): Promise<ReminderDailyTrendPoint[]>;
  getUserRoleDistribution(organizationId?: string): Promise<UserRoleDistributionPoint[]>;
  getUserStatusSummary(organizationId?: string): Promise<UserStatusPoint[]>;
}
