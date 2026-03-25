import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ONLINE_CLASS_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOnlineClassSessionDto } from './dto/create-online-class-session.dto';
import { UpsertOnlineClassProviderSettingDto } from './dto/upsert-online-class-provider-setting.dto';
import { UpdateOnlineClassSessionDto } from './dto/update-online-class-session.dto';
import { UpsertOnlineClassParticipantsDto } from './dto/upsert-online-class-participants.dto';
import { OnlineClassAlertsService } from './online-class-alerts.service';
import {
  OnlineClassAlertView,
  OnlineClassAutomationSummaryView,
  OnlineClassAutomationRunView,
  OnlineClassRepository,
  OnlineClassSessionView,
} from './interfaces/online-class.repository.interface';
import { GoogleMeetProvider } from './providers/google-meet.provider';

type OnlineClassProviderSettingRecord = {
  id: string;
  organizationId: string;
  provider: 'GOOGLE_MEET' | 'ZOOM';
  integrationEnabled: boolean;
  autoCreateMeetLinks: boolean;
  autoSyncParticipants: boolean;
  calendarId: string | null;
  impersonatedUserEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type OnlineTimetableAutomationRecord = {
  id: string;
  organizationId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

type OnlineClassAutomationRunRecord = {
  id: string;
  organizationId: string | null;
  triggeredByUserId: string | null;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  generatedCount: number;
  syncedCount: number;
  attendanceProcessedCount: number;
  errorMessage: string | null;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type OnlineClassAlertDeliveryRecord = {
  id: string;
  organizationId: string;
  subject: { name: string };
  batch: { name: string };
  scheduledStartAt: Date;
  meetingUrl: string | null;
  lastParticipantSyncError?: string | null;
  syncFailureAlertSentAt?: Date | null;
  pendingAttendanceAlertSentAt?: Date | null;
};

@Injectable()
export class OnlineClassesService {
  constructor(
    @Inject(ONLINE_CLASS_REPOSITORY)
    private readonly onlineClassRepository: OnlineClassRepository,
    private readonly auditLogService: AuditLogService,
    private readonly prisma: PrismaService,
    private readonly googleMeetProvider: GoogleMeetProvider,
    private readonly onlineClassAlertsService: OnlineClassAlertsService,
  ) {}

  async create(payload: CreateOnlineClassSessionDto, actor: CurrentUserContext) {
    const organizationId = this.resolveOrganizationId(actor);
    const session = await this.createSessionFromTimetable(payload, organizationId);

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'online-classes',
      action: 'create',
      targetId: session.id,
      metadata: {
        timetableEntryId: session.timetableEntryId,
        provider: session.provider,
        scheduledStartAt: session.scheduledStartAt.toISOString(),
      },
    });

    return session;
  }

  async findAll(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.onlineClassRepository.findMany(
      query,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
  }

  async findOne(id: string, actor: CurrentUserContext) {
    return this.getSessionOrThrow(
      id,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
  }

  async update(id: string, payload: UpdateOnlineClassSessionDto, actor: CurrentUserContext) {
    const session = await this.onlineClassRepository.update(
      id,
      payload,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'online-classes',
      action: 'update',
      targetId: id,
      metadata: { status: session.status },
    });

    return session;
  }

  async addParticipants(id: string, payload: UpsertOnlineClassParticipantsDto, actor: CurrentUserContext) {
    const session = await this.onlineClassRepository.addParticipantSessions(
      id,
      payload.participants,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'online-classes',
      action: 'participants-upsert',
      targetId: id,
      metadata: { participantCount: payload.participants.length },
    });

    return session;
  }

  async processAttendance(id: string, actor: CurrentUserContext) {
    const session = await this.getSessionOrThrow(
      id,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    const result = await this.processAttendanceForSession(session);

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'online-classes',
      action: 'attendance-processed',
      targetId: id,
      metadata: result,
    });

    return result;
  }

  async getProviderSetting(actor: CurrentUserContext): Promise<OnlineClassProviderSettingRecord> {
    return this.getProviderSettingByOrganizationId(this.resolveOrganizationId(actor));
  }

  async getProviderSettingByOrganizationId(organizationId: string): Promise<OnlineClassProviderSettingRecord> {
    const delegate = (this.prisma as never as {
      onlineClassProviderSetting: {
        findUnique(args: unknown): Promise<OnlineClassProviderSettingRecord | null>;
        upsert(args: unknown): Promise<OnlineClassProviderSettingRecord>;
      };
    }).onlineClassProviderSetting;

    const existing = await delegate.findUnique({ where: { organizationId } });
    if (existing) {
      return existing;
    }

    return delegate.upsert({
      where: { organizationId },
      update: {},
      create: {
        organizationId,
        provider: 'GOOGLE_MEET',
        integrationEnabled: false,
        autoCreateMeetLinks: false,
        autoSyncParticipants: false,
      },
    });
  }

  async upsertProviderSetting(payload: UpsertOnlineClassProviderSettingDto, actor: CurrentUserContext) {
    const organizationId = this.resolveOrganizationId(actor);
    const setting = await (this.prisma as never as {
      onlineClassProviderSetting: {
        upsert(args: unknown): Promise<OnlineClassProviderSettingRecord>;
      };
    }).onlineClassProviderSetting.upsert({
      where: { organizationId },
      update: payload,
      create: {
        organizationId,
        provider: payload.provider ?? 'GOOGLE_MEET',
        integrationEnabled: payload.integrationEnabled ?? false,
        autoCreateMeetLinks: payload.autoCreateMeetLinks ?? false,
        autoSyncParticipants: payload.autoSyncParticipants ?? false,
        calendarId: payload.calendarId ?? null,
        impersonatedUserEmail: payload.impersonatedUserEmail ?? null,
      },
    });

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'online-class-provider-settings',
      action: 'upsert',
      targetId: setting.id,
      metadata: {
        provider: setting.provider,
        integrationEnabled: setting.integrationEnabled,
        autoCreateMeetLinks: setting.autoCreateMeetLinks,
        autoSyncParticipants: setting.autoSyncParticipants,
        calendarId: setting.calendarId,
      },
    });

    return setting;
  }

  async createMeetLink(id: string, actor: CurrentUserContext) {
    const session = await this.getSessionOrThrow(
      id,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    if (session.provider !== 'GOOGLE_MEET') {
      throw new BadRequestException('Only Google Meet is supported by the current integration');
    }

    const setting = await this.getProviderSettingByOrganizationId(session.organizationId);
    const meeting = await this.googleMeetProvider.createMeeting(session, setting);
    const updated = await this.onlineClassRepository.update(
      id,
      {
        meetingUrl: meeting.meetingUrl,
        meetingCode: meeting.meetingCode,
        externalCalendarEventId: meeting.externalCalendarEventId,
      },
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'online-classes',
      action: 'generate-meet-link',
      targetId: id,
      metadata: {
        provider: updated.provider,
        meetingCode: updated.meetingCode,
        externalCalendarEventId: updated.externalCalendarEventId,
      },
    });

    return updated;
  }

  async syncParticipantsFromGoogle(id: string, actor: CurrentUserContext) {
    const session = await this.getSessionOrThrow(
      id,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    if (session.provider !== 'GOOGLE_MEET') {
      throw new BadRequestException('Only Google Meet is supported by the current integration');
    }

    const updated = await this.syncParticipantsForSession(session);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'online-classes',
      action: 'google-meet-sync',
      targetId: id,
      metadata: {
        participantCount: updated.participantSessions.length,
        externalConferenceRecordId: updated.externalConferenceRecordId,
      },
    });

    return updated;
  }

  async runAutomationCycle(): Promise<{
    generatedCount: number;
    syncedCount: number;
    attendanceProcessedCount: number;
  }> {
    const run = await this.createAutomationRun();
    try {
      const generatedCount = await this.generateScheduledSessionsForDateOffsets([0, 1]);
      const candidateSessions = await this.findAutomationCandidates();

      let syncedCount = 0;
      let attendanceProcessedCount = 0;

      for (const session of candidateSessions) {
        const providerSetting = await this.getProviderSettingByOrganizationId(session.organizationId);

        if (session.provider === 'GOOGLE_MEET' && providerSetting.integrationEnabled && providerSetting.autoSyncParticipants) {
          try {
            await this.syncParticipantsForSession(session);
            syncedCount += 1;
          } catch {
            // Keep the automation cycle resilient.
          }
        }

        const sessionEnd = new Date(session.scheduledEndAt);
        if (session.attendanceProcessedAt || sessionEnd.getTime() > Date.now() - 5 * 60 * 1000) {
          continue;
        }

        try {
          const freshSession = await this.getSessionOrThrow(session.id);
          await this.processAttendanceForSession(freshSession);
          attendanceProcessedCount += 1;
        } catch {
          // Keep the automation cycle resilient.
        }
      }

      await this.completeAutomationRun(run.id, {
        status: 'SUCCESS',
        generatedCount,
        syncedCount,
        attendanceProcessedCount,
      });
      await this.auditLogService.log({
        module: 'online-classes',
        action: 'automation-cycle',
        metadata: { generatedCount, syncedCount, attendanceProcessedCount },
      });
      await this.dispatchOperationalAlerts();

      return { generatedCount, syncedCount, attendanceProcessedCount };
    } catch (error) {
      await this.completeAutomationRun(run.id, {
        status: 'FAILED',
        errorMessage: error instanceof Error ? error.message : 'Unknown automation error',
      });
      throw error;
    }
  }

  async getAutomationSummary(actor: CurrentUserContext): Promise<OnlineClassAutomationSummaryView> {
    const organizationId = actor.roles.includes('SUPER_ADMIN') ? undefined : actor.organizationId ?? undefined;
    const teacherScoped = actor.roles.includes('TEACHER');
    const runs = await (this.prisma as never as {
      onlineClassAutomationRun: { findMany(args: unknown): Promise<OnlineClassAutomationRunRecord[]> };
      onlineClassSession: { count(args: unknown): Promise<number> };
    }).onlineClassAutomationRun.findMany({
      where: organizationId ? { organizationId } : {},
      orderBy: [{ startedAt: 'desc' }],
      take: 6,
    });
    const [failedSessionsCount, pendingAttendanceCount] = await Promise.all([
      (this.prisma as never as { onlineClassSession: { count(args: unknown): Promise<number> } }).onlineClassSession.count({
        where: {
          ...(organizationId ? { organizationId } : {}),
          lastParticipantSyncStatus: 'FAILED',
        },
      }),
      (this.prisma as never as { onlineClassSession: { count(args: unknown): Promise<number> } }).onlineClassSession.count({
        where: {
          ...(organizationId ? { organizationId } : {}),
          attendanceProcessedAt: null,
          scheduledEndAt: { lte: new Date(Date.now() - 5 * 60 * 1000) },
        },
      }),
    ]);

    const recentSessions = await this.onlineClassRepository.findMany(
      {
        page: 1,
        limit: 100,
        sortOrder: 'desc',
      } as PaginationQueryDto,
      organizationId,
    );
    const scopedSessions = teacherScoped
      ? recentSessions.items.filter((session) => session.teacherEmail === actor.email)
      : recentSessions.items;
    const upcomingSessions = scopedSessions
      .filter((session) => new Date(session.scheduledStartAt).getTime() >= Date.now())
      .sort((left, right) => new Date(left.scheduledStartAt).getTime() - new Date(right.scheduledStartAt).getTime())
      .slice(0, 5);

    return {
      lastRun: runs[0] ? this.toAutomationRunView(runs[0]) : null,
      recentRuns: runs.map((run) => this.toAutomationRunView(run)),
      failedSessionsCount: teacherScoped
        ? scopedSessions.filter((session) => session.lastParticipantSyncStatus === 'FAILED').length
        : failedSessionsCount,
      pendingAttendanceCount: teacherScoped
        ? scopedSessions.filter(
            (session) =>
              !session.attendanceProcessedAt &&
              new Date(session.scheduledEndAt).getTime() <= Date.now() - 5 * 60 * 1000,
          ).length
        : pendingAttendanceCount,
      upcomingSessions,
    };
  }

  async getAlerts(actor: CurrentUserContext): Promise<OnlineClassAlertView[]> {
    const organizationId = actor.roles.includes('SUPER_ADMIN') ? undefined : actor.organizationId ?? undefined;
    const teacherScoped = actor.roles.includes('TEACHER');
    const recentSessions = await this.onlineClassRepository.findMany(
      {
        page: 1,
        limit: 100,
        sortOrder: 'desc',
      } as PaginationQueryDto,
      organizationId,
    );

    const now = Date.now();
    const alerts: OnlineClassAlertView[] = [];

    for (const session of recentSessions.items) {
      if (teacherScoped && session.teacherEmail !== actor.email) {
        continue;
      }
      const scheduledAt = new Date(session.scheduledStartAt);
      const startsInMinutes = Math.round((scheduledAt.getTime() - now) / 60000);

      if (session.lastParticipantSyncStatus === 'FAILED') {
        alerts.push({
          id: `sync-failed-${session.id}`,
          type: 'SYNC_FAILED',
          severity: 'HIGH',
          title: `${session.subjectName} sync failed`,
          description: session.lastParticipantSyncError || `Participant sync failed for ${session.batchName}.`,
          sessionId: session.id,
          scheduledAt,
        });
      }

      if (!session.attendanceProcessedAt && new Date(session.scheduledEndAt).getTime() <= now - 5 * 60 * 1000) {
        alerts.push({
          id: `attendance-pending-${session.id}`,
          type: 'PENDING_ATTENDANCE',
          severity: 'MEDIUM',
          title: `${session.subjectName} attendance pending`,
          description: `Attendance has not been processed yet for ${session.batchName}.`,
          sessionId: session.id,
          scheduledAt,
        });
      }

      if (startsInMinutes >= 0 && startsInMinutes <= 60) {
        alerts.push({
          id: `starting-soon-${session.id}`,
          type: 'CLASS_STARTING_SOON',
          severity: 'LOW',
          title: `${session.subjectName} starts soon`,
          description: `${session.batchName} starts in ${startsInMinutes} minute${startsInMinutes === 1 ? '' : 's'}.`,
          sessionId: session.id,
          scheduledAt,
        });
      }
    }

    return alerts
      .sort((left, right) => (right.scheduledAt?.getTime() ?? 0) - (left.scheduledAt?.getTime() ?? 0))
      .slice(0, 12);
  }

  private async createSessionFromTimetable(
    payload: CreateOnlineClassSessionDto,
    organizationId: string,
  ): Promise<OnlineClassSessionView> {
    let session = await this.onlineClassRepository.createFromTimetable(payload, organizationId);
    const providerSetting = await this.getProviderSettingByOrganizationId(organizationId);

    if (session.provider === 'GOOGLE_MEET' && providerSetting.integrationEnabled && providerSetting.autoCreateMeetLinks) {
      try {
        const meeting = await this.googleMeetProvider.createMeeting(session, providerSetting);
        session = await this.onlineClassRepository.update(
          session.id,
          {
            meetingUrl: meeting.meetingUrl,
            meetingCode: meeting.meetingCode,
            externalCalendarEventId: meeting.externalCalendarEventId,
          },
          organizationId,
        );
      } catch {
        // Keep class scheduling independent from external meeting creation.
      }
    }

    return session;
  }

  private async syncParticipantsForSession(session: OnlineClassSessionView): Promise<OnlineClassSessionView> {
    try {
      const setting = await this.getProviderSettingByOrganizationId(session.organizationId);
      const synced = await this.googleMeetProvider.syncParticipants(session, setting, async (email) => {
        const student = await this.prisma.student.findFirst({
          where: {
            organizationId: session.organizationId,
            OR: [{ email }, { guardianEmail: email }],
          },
          select: { id: true },
        });

        return student?.id ?? null;
      });

      const existingKeys = new Set(
        session.participantSessions.map((participant) =>
          [participant.externalParticipantId ?? 'na', new Date(participant.joinedAt).toISOString()].join(':'),
        ),
      );
      const participantsToInsert = synced.participants.filter((participant) => {
        const key = [participant.externalParticipantId ?? 'na', participant.joinedAt.toISOString()].join(':');
        return !existingKeys.has(key);
      });

      const updatedSession = await this.onlineClassRepository.update(
        session.id,
        {
          meetingUrl: synced.meetingUrl,
          meetingCode: synced.meetingCode,
          externalCalendarEventId: synced.externalCalendarEventId,
          externalSpaceId: synced.externalSpaceId,
          externalConferenceRecordId: synced.externalConferenceRecordId,
          actualStartAt: synced.actualStartAt,
          actualEndAt: synced.actualEndAt,
          lastParticipantSyncAt: new Date(),
          lastParticipantSyncStatus: 'SUCCESS',
          lastParticipantSyncError: null,
        },
        session.organizationId,
      );

      return this.onlineClassRepository.addParticipantSessions(
        updatedSession.id,
        participantsToInsert,
        session.organizationId,
      );
    } catch (error) {
      await this.onlineClassRepository.update(
        session.id,
        {
          lastParticipantSyncAt: new Date(),
          lastParticipantSyncStatus: 'FAILED',
          lastParticipantSyncError: error instanceof Error ? error.message : 'Unknown participant sync error',
        },
        session.organizationId,
      );
      throw error;
    }
  }

  private async processAttendanceForSession(session: OnlineClassSessionView) {
    const rawTimetable = await this.prisma.timetableEntry.findUnique({
      where: { id: session.timetableEntryId },
      select: { id: true },
    });
    const timetable = rawTimetable as (typeof rawTimetable & {
      attendanceJoinThresholdMinutes?: number;
    }) | null;

    if (!timetable || !session.organizationId) {
      throw new NotFoundException('Online class session context is incomplete');
    }

    const attendanceDate = new Date(session.scheduledStartAt);
    attendanceDate.setHours(0, 0, 0, 0);

    const eligibleParticipants = session.participantSessions.filter(
      (participant) =>
        Boolean(participant.studentId) &&
        participant.totalMinutes >= (timetable.attendanceJoinThresholdMinutes ?? 5),
    );

    let createdCount = 0;
    let skippedCount = 0;

    for (const participant of eligibleParticipants) {
      const existing = await this.prisma.attendance.findFirst({
        where: {
          organizationId: session.organizationId,
          studentId: participant.studentId!,
          batchId: session.batchId,
          attendanceDate,
        },
        select: { id: true },
      });

      if (existing) {
        skippedCount += 1;
        continue;
      }

      await (this.prisma.attendance as never as { create(args: unknown): Promise<unknown> }).create({
        data: {
          organizationId: session.organizationId,
          studentId: participant.studentId,
          batchId: session.batchId,
          attendanceDate,
          status: 'PRESENT',
          source: 'ONLINE_CLASS',
          onlineClassSessionId: session.id,
          remarks: `Auto-marked from ${session.provider.replaceAll('_', ' ')} participant session`,
        },
      });

      await (this.prisma as never as {
        onlineClassParticipantSession: { update(args: unknown): Promise<unknown> };
      }).onlineClassParticipantSession.update({
        where: { id: participant.id },
        data: { attendanceMarked: true },
      });

      createdCount += 1;
    }

    await this.onlineClassRepository.markAttendanceProcessed(session.id);
    return { createdCount, skippedCount };
  }

  private async generateScheduledSessionsForDateOffsets(offsets: number[]): Promise<number> {
    const timetableEntries = await (this.prisma.timetableEntry as never as {
      findMany(args: unknown): Promise<OnlineTimetableAutomationRecord[]>;
    }).findMany({
      where: {
        isActive: true,
        deliveryMode: { not: 'OFFLINE' },
      },
      select: {
        id: true,
        organizationId: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        isActive: true,
      },
    });

    let generatedCount = 0;

    for (const entry of timetableEntries) {
      for (const offset of offsets) {
        const targetDate = new Date();
        targetDate.setHours(0, 0, 0, 0);
        targetDate.setDate(targetDate.getDate() + offset);

        if (this.toTimetableDayOfWeek(targetDate) !== entry.dayOfWeek) {
          continue;
        }

        const scheduledStartAt = this.combineDateAndTime(targetDate, entry.startTime);
        const scheduledEndAt = this.combineDateAndTime(targetDate, entry.endTime);

        const existing = await (this.prisma as never as {
          onlineClassSession: { findFirst(args: unknown): Promise<{ id: string } | null> };
        }).onlineClassSession.findFirst({
          where: {
            timetableEntryId: entry.id,
            scheduledStartAt,
          },
          select: { id: true },
        });

        if (existing) {
          continue;
        }

        const session = await this.createSessionFromTimetable(
          {
            timetableEntryId: entry.id,
            scheduledStartAt,
            scheduledEndAt,
          },
          entry.organizationId,
        );

        await this.auditLogService.log({
          module: 'online-classes',
          action: 'automation-generated',
          targetId: session.id,
          metadata: {
            organizationId: entry.organizationId,
            timetableEntryId: entry.id,
            scheduledStartAt: scheduledStartAt.toISOString(),
          },
        });
        generatedCount += 1;
      }
    }

    return generatedCount;
  }

  private async findAutomationCandidates(): Promise<OnlineClassSessionView[]> {
    const result = await this.onlineClassRepository.findMany(
      {
        page: 1,
        limit: 100,
        sortOrder: 'desc',
      } as PaginationQueryDto,
      undefined,
    );

    return result.items.filter(
      (session) =>
        session.provider === 'GOOGLE_MEET' &&
        new Date(session.scheduledStartAt).getTime() <= Date.now() + 24 * 60 * 60 * 1000,
    );
  }

  private async getSessionOrThrow(id: string, organizationId?: string): Promise<OnlineClassSessionView> {
    const session = await this.onlineClassRepository.findById(id, organizationId);
    if (!session) {
      throw new NotFoundException('Online class session not found');
    }

    return session;
  }

  private combineDateAndTime(baseDate: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  private toTimetableDayOfWeek(date: Date): string {
    return ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][date.getDay()] ?? 'MONDAY';
  }

  private async createAutomationRun(): Promise<OnlineClassAutomationRunRecord> {
    return (this.prisma as never as {
      onlineClassAutomationRun: { create(args: unknown): Promise<OnlineClassAutomationRunRecord> };
    }).onlineClassAutomationRun.create({
      data: { status: 'PENDING' },
    });
  }

  private async completeAutomationRun(
    id: string,
    payload: {
      status: 'SUCCESS' | 'FAILED';
      generatedCount?: number;
      syncedCount?: number;
      attendanceProcessedCount?: number;
      errorMessage?: string;
    },
  ): Promise<void> {
    await (this.prisma as never as {
      onlineClassAutomationRun: { update(args: unknown): Promise<unknown> };
    }).onlineClassAutomationRun.update({
      where: { id },
      data: {
        status: payload.status,
        generatedCount: payload.generatedCount ?? 0,
        syncedCount: payload.syncedCount ?? 0,
        attendanceProcessedCount: payload.attendanceProcessedCount ?? 0,
        errorMessage: payload.errorMessage ?? null,
        completedAt: new Date(),
      },
    });
  }

  private toAutomationRunView(run: OnlineClassAutomationRunRecord): OnlineClassAutomationRunView {
    return {
      id: run.id,
      organizationId: run.organizationId,
      triggeredByUserId: run.triggeredByUserId,
      status: run.status,
      generatedCount: run.generatedCount,
      syncedCount: run.syncedCount,
      attendanceProcessedCount: run.attendanceProcessedCount,
      errorMessage: run.errorMessage,
      startedAt: run.startedAt,
      completedAt: run.completedAt,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
    };
  }

  private async dispatchOperationalAlerts(): Promise<void> {
    const sessions = await (this.prisma as never as {
      onlineClassSession: { findMany(args: unknown): Promise<OnlineClassAlertDeliveryRecord[]> };
    }).onlineClassSession.findMany({
      where: {
        OR: [
          {
            lastParticipantSyncStatus: 'FAILED',
            syncFailureAlertSentAt: null,
          },
          {
            attendanceProcessedAt: null,
            pendingAttendanceAlertSentAt: null,
            scheduledEndAt: { lte: new Date(Date.now() - 30 * 60 * 1000) },
          },
        ],
      },
      select: {
        id: true,
        organizationId: true,
        subject: { select: { name: true } },
        batch: { select: { name: true } },
        scheduledStartAt: true,
        meetingUrl: true,
        lastParticipantSyncError: true,
        syncFailureAlertSentAt: true,
        pendingAttendanceAlertSentAt: true,
      },
    });

    for (const session of sessions) {
      const recipients = await this.getAlertRecipients(session.organizationId);
      if (!recipients.length) {
        continue;
      }

      if (!session.syncFailureAlertSentAt) {
        const delivery = await this.onlineClassAlertsService.sendAlert(recipients, {
          subject: `Online class sync failed: ${session.subject.name}`,
          heading: 'Online participant sync failed',
          message: `${session.subject.name} for ${session.batch.name} could not sync participant activity. ${session.lastParticipantSyncError ?? ''}`.trim(),
          actionLabel: 'Open online classes',
          actionUrl: session.meetingUrl ?? undefined,
        });

        if (delivery.delivered) {
          await (this.prisma as never as {
            onlineClassSession: { update(args: unknown): Promise<unknown> };
          }).onlineClassSession.update({
            where: { id: session.id },
            data: { syncFailureAlertSentAt: new Date() },
          });
        }
      }

      if (!session.pendingAttendanceAlertSentAt) {
        const delivery = await this.onlineClassAlertsService.sendAlert(recipients, {
          subject: `Attendance pending: ${session.subject.name}`,
          heading: 'Online class attendance is still pending',
          message: `${session.subject.name} for ${session.batch.name} ended at ${session.scheduledStartAt.toISOString()} and attendance still has not been processed.`,
          actionLabel: 'Review attendance',
          actionUrl: session.meetingUrl ?? undefined,
        });

        if (delivery.delivered) {
          await (this.prisma as never as {
            onlineClassSession: { update(args: unknown): Promise<unknown> };
          }).onlineClassSession.update({
            where: { id: session.id },
            data: { pendingAttendanceAlertSentAt: new Date() },
          });
        }
      }
    }
  }

  private async getAlertRecipients(organizationId: string): Promise<Array<{ email: string; firstName?: string | null }>> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      select: { email: true },
    });
    const users = await this.prisma.user.findMany({
      where: {
        organizationId,
        isActive: true,
        userRoles: {
          some: {
            role: {
              name: {
                in: ['ADMIN', 'ACADEMIC_COORDINATOR'],
              },
            },
          },
        },
      },
      select: {
        email: true,
        firstName: true,
      },
    });

    return [
      ...(organization?.email ? [{ email: organization.email, firstName: null }] : []),
      ...users.map((user) => ({ email: user.email, firstName: user.firstName })),
    ];
  }

  private resolveOrganizationId(actor: CurrentUserContext): string {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }

    return actor.organizationId;
  }
}
