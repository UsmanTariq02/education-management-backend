import { Injectable } from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  CreateOnlineClassSessionPayload,
  OnlineClassParticipantSessionView,
  OnlineClassRepository,
  OnlineClassSessionView,
  UpdateOnlineClassSessionPayload,
  UpsertOnlineParticipantPayload,
} from '../interfaces/online-class.repository.interface';

const sessionInclude = {
  organization: { select: { id: true, name: true } },
  academicSession: { select: { id: true, name: true } },
  batch: { select: { id: true, name: true, code: true } },
  subject: { select: { id: true, name: true, code: true } },
  teacher: { select: { id: true, fullName: true, email: true } },
  participantSessions: {
    include: {
      student: { select: { id: true, fullName: true } },
    },
    orderBy: { joinedAt: 'asc' },
  },
  timetableEntry: {
    select: {
      id: true,
      academicSessionId: true,
      batchId: true,
      subjectId: true,
      teacherId: true,
      onlineClassProvider: true,
      onlineMeetingUrl: true,
      onlineMeetingCode: true,
      externalCalendarEventId: true,
    },
  },
} as const;

type OnlineClassSessionRecord = {
  id: string;
  organization: { id: string; name: string };
  timetableEntryId: string;
  academicSession: { id: string; name: string } | null;
  batch: { id: string; name: string; code: string };
  subject: { id: string; name: string; code: string };
  teacher: { id: string; fullName: string; email: string | null } | null;
  provider: string;
  status: string;
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
  lastParticipantSyncStatus: string;
  lastParticipantSyncError: string | null;
  attendanceProcessedAt: Date | null;
  participantSessions: Array<{
    id: string;
    studentId: string | null;
    student: { id: string; fullName: string } | null;
    participantEmail: string | null;
    participantName: string | null;
    externalParticipantId: string | null;
    joinedAt: Date;
    leftAt: Date | null;
    totalMinutes: number;
    attendanceMarked: boolean;
  }>;
  createdAt: Date;
  updatedAt: Date;
};

type OnlineTimetableEntryRecord = {
  id: string;
  academicSessionId: string | null;
  batchId: string;
  subjectId: string;
  teacherId: string | null;
  onlineClassProvider?: string | null;
  onlineMeetingUrl?: string | null;
  onlineMeetingCode?: string | null;
  externalCalendarEventId?: string | null;
};

@Injectable()
export class OnlineClassPrismaRepository implements OnlineClassRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createFromTimetable(
    payload: CreateOnlineClassSessionPayload,
    organizationId: string,
  ): Promise<OnlineClassSessionView> {
    const timetableEntry = await (this.prisma.timetableEntry as never as {
      findFirstOrThrow(args: unknown): Promise<OnlineTimetableEntryRecord>;
    }).findFirstOrThrow({
      where: { id: payload.timetableEntryId, organizationId },
      select: {
        id: true,
        academicSessionId: true,
        batchId: true,
        subjectId: true,
        teacherId: true,
        onlineClassProvider: true,
        onlineMeetingUrl: true,
        onlineMeetingCode: true,
        externalCalendarEventId: true,
      },
    });

    const item = await (this.prisma as never as { onlineClassSession: { create(args: unknown): Promise<OnlineClassSessionRecord> } }).onlineClassSession.create({
      data: {
        organizationId,
        timetableEntryId: timetableEntry.id,
        academicSessionId: timetableEntry.academicSessionId,
        batchId: timetableEntry.batchId,
        subjectId: timetableEntry.subjectId,
        teacherId: timetableEntry.teacherId,
        provider: timetableEntry.onlineClassProvider ?? 'GOOGLE_MEET',
        scheduledStartAt: payload.scheduledStartAt,
        scheduledEndAt: payload.scheduledEndAt,
        meetingUrl: timetableEntry.onlineMeetingUrl,
        meetingCode: timetableEntry.onlineMeetingCode,
        externalCalendarEventId: timetableEntry.externalCalendarEventId,
      },
      include: sessionInclude,
    });

    return this.toView(item);
  }

  async findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<OnlineClassSessionView>> {
    const where: Record<string, unknown> = {
      ...(organizationId ? { organizationId } : {}),
      ...(query.search
        ? {
            OR: [
              { batch: { name: { contains: query.search, mode: 'insensitive' } } },
              { subject: { name: { contains: query.search, mode: 'insensitive' } } },
              { teacher: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { meetingCode: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const onlineClassDelegate = (this.prisma as never as {
      onlineClassSession: {
        findMany(args: unknown): Promise<OnlineClassSessionRecord[]>;
        count(args: unknown): Promise<number>;
      };
    }).onlineClassSession;

    const items = await onlineClassDelegate.findMany({
      where,
      include: sessionInclude,
      ...buildPagination(query),
      orderBy: [{ scheduledStartAt: 'desc' }],
    });
    const total = await onlineClassDelegate.count({ where });

    return {
      items: items.map((item: OnlineClassSessionRecord) => this.toView(item)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findById(id: string, organizationId?: string): Promise<OnlineClassSessionView | null> {
    const item = await (this.prisma as never as {
      onlineClassSession: {
        findFirst(args: unknown): Promise<OnlineClassSessionRecord | null>;
      };
    }).onlineClassSession.findFirst({
      where: { id, ...(organizationId ? { organizationId } : {}) },
      include: sessionInclude,
    });

    return item ? this.toView(item) : null;
  }

  async update(
    id: string,
    payload: UpdateOnlineClassSessionPayload,
    organizationId?: string,
  ): Promise<OnlineClassSessionView> {
    if (organizationId) {
      await (this.prisma as never as { onlineClassSession: { findFirstOrThrow(args: unknown): Promise<unknown> } }).onlineClassSession.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }

    const item = await (this.prisma as never as { onlineClassSession: { update(args: unknown): Promise<OnlineClassSessionRecord> } }).onlineClassSession.update({
      where: { id },
      data: payload,
      include: sessionInclude,
    });

    return this.toView(item);
  }

  async addParticipantSessions(
    sessionId: string,
    payload: UpsertOnlineParticipantPayload[],
    organizationId?: string,
  ): Promise<OnlineClassSessionView> {
    if (organizationId) {
      await (this.prisma as never as { onlineClassSession: { findFirstOrThrow(args: unknown): Promise<unknown> } }).onlineClassSession.findFirstOrThrow({
        where: { id: sessionId, organizationId },
        select: { id: true },
      });
    }

    const participantDelegate = (this.prisma as never as {
      onlineClassParticipantSession: {
        create(args: unknown): Promise<unknown>;
      };
      onlineClassSession: {
        findUniqueOrThrow(args: unknown): Promise<OnlineClassSessionRecord>;
      };
    });

    await Promise.all(
      payload.map((item: UpsertOnlineParticipantPayload) =>
        participantDelegate.onlineClassParticipantSession.create({
          data: {
            organizationId,
            onlineClassSessionId: sessionId,
            studentId: item.studentId ?? null,
            participantEmail: item.participantEmail ?? null,
            participantName: item.participantName ?? null,
            externalParticipantId: item.externalParticipantId ?? null,
            joinedAt: item.joinedAt,
            leftAt: item.leftAt ?? null,
            totalMinutes: item.totalMinutes,
          },
        }),
      ),
    );

    const session = await participantDelegate.onlineClassSession.findUniqueOrThrow({
      where: { id: sessionId },
      include: sessionInclude,
    });

    return this.toView(session);
  }

  async markAttendanceProcessed(sessionId: string): Promise<void> {
    await (this.prisma as never as { onlineClassSession: { update(args: unknown): Promise<unknown> } }).onlineClassSession.update({
      where: { id: sessionId },
      data: { attendanceProcessedAt: new Date() },
    });
  }

  private toView(
    item: OnlineClassSessionRecord,
  ): OnlineClassSessionView {
    const rawItem = item as unknown as Record<string, unknown>;

    return {
      id: item.id,
      organizationId: item.organization.id,
      organizationName: item.organization.name,
      timetableEntryId: item.timetableEntryId,
      academicSessionId: item.academicSession?.id ?? null,
      academicSessionName: item.academicSession?.name ?? null,
      batchId: item.batch.id,
      batchName: item.batch.name,
      batchCode: item.batch.code,
      subjectId: item.subject.id,
      subjectName: item.subject.name,
      subjectCode: item.subject.code,
      teacherId: item.teacher?.id ?? null,
      teacherName: item.teacher?.fullName ?? null,
      teacherEmail: item.teacher?.email ?? null,
      provider: item.provider as OnlineClassSessionView['provider'],
      status: item.status as OnlineClassSessionView['status'],
      scheduledStartAt: item.scheduledStartAt,
      scheduledEndAt: item.scheduledEndAt,
      actualStartAt: item.actualStartAt,
      actualEndAt: item.actualEndAt,
      meetingUrl: item.meetingUrl,
      meetingCode: item.meetingCode,
      externalCalendarEventId: (rawItem.externalCalendarEventId as string | null | undefined) ?? null,
      externalSpaceId: (rawItem.externalSpaceId as string | null | undefined) ?? null,
      externalConferenceRecordId: (rawItem.externalConferenceRecordId as string | null | undefined) ?? null,
      lastParticipantSyncAt: (rawItem.lastParticipantSyncAt as Date | null | undefined) ?? null,
      lastParticipantSyncStatus:
        (rawItem.lastParticipantSyncStatus as OnlineClassSessionView['lastParticipantSyncStatus'] | undefined) ??
        'PENDING',
      lastParticipantSyncError: (rawItem.lastParticipantSyncError as string | null | undefined) ?? null,
      attendanceProcessedAt: item.attendanceProcessedAt,
      participantSessions: item.participantSessions.map(
        (participant): OnlineClassParticipantSessionView => ({
          id: participant.id,
          studentId: participant.studentId,
          studentName: participant.student?.fullName ?? null,
          participantEmail: participant.participantEmail,
          participantName: participant.participantName,
          externalParticipantId: participant.externalParticipantId,
          joinedAt: participant.joinedAt,
          leftAt: participant.leftAt,
          totalMinutes: participant.totalMinutes,
          attendanceMarked: participant.attendanceMarked,
        }),
      ),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
