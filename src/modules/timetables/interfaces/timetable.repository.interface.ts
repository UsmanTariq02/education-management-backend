import { TimetableDayOfWeek } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateTimetableEntryDto } from '../dto/create-timetable-entry.dto';
import { UpdateTimetableEntryDto } from '../dto/update-timetable-entry.dto';

export type ClassDeliveryModeView = 'OFFLINE' | 'ONLINE' | 'HYBRID';
export type OnlineClassProviderView = 'GOOGLE_MEET' | 'ZOOM';

export interface TimetableEntryView {
  id: string;
  organizationId: string;
  organizationName: string;
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
  dayOfWeek: TimetableDayOfWeek;
  startTime: string;
  endTime: string;
  deliveryMode: ClassDeliveryModeView;
  onlineClassProvider: OnlineClassProviderView | null;
  onlineMeetingUrl: string | null;
  onlineMeetingCode: string | null;
  externalCalendarEventId: string | null;
  autoAttendanceEnabled: boolean;
  attendanceJoinThresholdMinutes: number;
  room: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TimetableRepository {
  create(payload: CreateTimetableEntryDto, organizationId: string): Promise<TimetableEntryView>;
  findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<TimetableEntryView>>;
  findById(id: string): Promise<TimetableEntryView | null>;
  update(id: string, payload: UpdateTimetableEntryDto, organizationId?: string): Promise<TimetableEntryView>;
  delete(id: string, organizationId?: string): Promise<void>;
}
