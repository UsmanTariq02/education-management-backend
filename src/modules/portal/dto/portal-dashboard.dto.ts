import { AttendanceStatus, FeeRecordStatus, PortalAccountType, ReminderChannel, ReminderStatus, TimetableDayOfWeek } from '@prisma/client';

export interface PortalDashboardDto {
  accountType: PortalAccountType;
  student: {
    id: string;
    fullName: string;
    guardianName: string;
    email: string | null;
    guardianEmail: string | null;
    phone: string;
    guardianPhone: string;
    status: string;
    organizationName: string;
    batches: Array<{ id: string; name: string; code: string }>;
  };
  feeSummary: {
    totalDue: number;
    totalPaid: number;
    pendingAmount: number;
    overdueCount: number;
    recentRecords: Array<{
      id: string;
      month: number;
      year: number;
      amountDue: number;
      amountPaid: number;
      status: FeeRecordStatus;
      paidAt: Date | null;
    }>;
  };
  attendanceSummary: {
    totalEntries: number;
    attendanceRate: number;
    breakdown: Array<{ status: AttendanceStatus; total: number }>;
    recentRecords: Array<{
      id: string;
      attendanceDate: Date;
      status: AttendanceStatus;
      notes: string | null;
      batchName: string;
    }>;
  };
  reminderSummary: {
    total: number;
    sent: number;
    failed: number;
    recentRecords: Array<{
      id: string;
      channel: ReminderChannel;
      status: ReminderStatus;
      createdAt: Date;
      message: string;
    }>;
  };
  academicSummary: {
    publishedResults: number;
    latestPercentage: number | null;
    latestGrade: string | null;
    recentResults: Array<{
      id: string;
      examName: string;
      batchName: string;
      percentage: number;
      grade: string | null;
      publishedAt: Date | null;
      items: Array<{
        subjectName: string;
        obtainedMarks: number;
        totalMarks: number;
        grade: string | null;
      }>;
    }>;
    timetable: Array<{
      id: string;
      dayOfWeek: TimetableDayOfWeek;
      startTime: string;
      endTime: string;
      subjectName: string;
      teacherName: string | null;
      room: string | null;
      batchName: string;
    }>;
  };
}
