import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';

export type OnlineClassProviderView = 'GOOGLE_MEET' | 'ZOOM';
export type OnlineClassSessionStatusView = 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
export type SyncJobStatusView = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface OnlineClassParticipantSessionView {
  id: string;
  studentId: string | null;
  studentName: string | null;
  participantEmail: string | null;
  participantName: string | null;
  externalParticipantId: string | null;
  joinedAt: Date;
  leftAt: Date | null;
  totalMinutes: number;
  attendanceMarked: boolean;
}

export interface OnlineClassSessionView {
  id: string;
  organizationId: string;
  organizationName: string;
  timetableEntryId: string;
  academicSessionId: string | null;
  academicSessionName: string | null;
  batchId: string;
  batchName: string;
  batchCode: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string | null;
  teacherName: string | null;
  teacherEmail: string | null;
  provider: OnlineClassProviderView;
  status: OnlineClassSessionStatusView;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  meetingUrl: string | null;
  meetingCode: string | null;
  externalCalendarEventId: string | null;
  externalSpaceId: string | null;
  externalConferenceRecordId: string | null;
  lastParticipantSyncAt: Date | null;
  lastParticipantSyncStatus: SyncJobStatusView;
  lastParticipantSyncError: string | null;
  attendanceProcessedAt: Date | null;
  participantSessions: OnlineClassParticipantSessionView[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOnlineClassSessionPayload {
  timetableEntryId: string;
  scheduledStartAt: Date;
  scheduledEndAt: Date;
}

export interface UpdateOnlineClassSessionPayload {
  status?: OnlineClassSessionStatusView;
  actualStartAt?: Date | null;
  actualEndAt?: Date | null;
  meetingUrl?: string | null;
  meetingCode?: string | null;
  externalCalendarEventId?: string | null;
  externalSpaceId?: string | null;
  externalConferenceRecordId?: string | null;
  lastParticipantSyncAt?: Date | null;
  lastParticipantSyncStatus?: SyncJobStatusView;
  lastParticipantSyncError?: string | null;
}

export interface OnlineClassAutomationRunView {
  id: string;
  organizationId: string | null;
  triggeredByUserId: string | null;
  status: SyncJobStatusView;
  generatedCount: number;
  syncedCount: number;
  attendanceProcessedCount: number;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface OnlineClassAutomationSummaryView {
  lastRun: OnlineClassAutomationRunView | null;
  recentRuns: OnlineClassAutomationRunView[];
  failedSessionsCount: number;
  pendingAttendanceCount: number;
  upcomingSessions: OnlineClassSessionView[];
}

export interface OnlineClassAlertView {
  id: string;
  type: 'SYNC_FAILED' | 'PENDING_ATTENDANCE' | 'CLASS_STARTING_SOON';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  sessionId: string | null;
  scheduledAt: Date | null;
}

export interface UpsertOnlineParticipantPayload {
  studentId?: string | null;
  participantEmail?: string | null;
  participantName?: string | null;
  externalParticipantId?: string | null;
  joinedAt: Date;
  leftAt?: Date | null;
  totalMinutes: number;
}

export interface OnlineClassRepository {
  createFromTimetable(
    payload: CreateOnlineClassSessionPayload,
    organizationId: string,
  ): Promise<OnlineClassSessionView>;
  findMany(
    query: PaginationQueryDto,
    organizationId?: string,
  ): Promise<PaginatedResult<OnlineClassSessionView>>;
  findById(id: string, organizationId?: string): Promise<OnlineClassSessionView | null>;
  update(
    id: string,
    payload: UpdateOnlineClassSessionPayload,
    organizationId?: string,
  ): Promise<OnlineClassSessionView>;
  addParticipantSessions(
    sessionId: string,
    payload: UpsertOnlineParticipantPayload[],
    organizationId?: string,
  ): Promise<OnlineClassSessionView>;
  markAttendanceProcessed(sessionId: string): Promise<void>;
}
