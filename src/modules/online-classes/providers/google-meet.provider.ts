import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfiguration } from '../../../config/configuration';
import type { OnlineClassSessionView } from '../interfaces/online-class.repository.interface';
import { GoogleWorkspaceAuthService } from './google-workspace-auth.service';

type OnlineClassProviderSettingView = {
  provider: 'GOOGLE_MEET' | 'ZOOM';
  integrationEnabled: boolean;
  autoCreateMeetLinks: boolean;
  autoSyncParticipants: boolean;
  calendarId: string | null;
  impersonatedUserEmail: string | null;
};

type CalendarEventResponse = {
  id?: string;
  hangoutLink?: string;
  conferenceData?: {
    conferenceId?: string;
    entryPoints?: Array<{ entryPointType?: string; uri?: string }>;
  };
};

type ConferenceRecord = {
  name: string;
  startTime?: string;
  endTime?: string;
  space?: string;
};

type ConferenceListResponse = { conferenceRecords?: ConferenceRecord[] };

type MeetParticipant = {
  name: string;
  signedinUser?: { user?: string; displayName?: string };
  anonymousUser?: { displayName?: string };
  phoneUser?: { displayName?: string };
};

type MeetParticipantListResponse = { participants?: MeetParticipant[] };

type ParticipantSession = {
  name: string;
  startTime: string;
  endTime?: string;
};

type ParticipantSessionListResponse = { participantSessions?: ParticipantSession[] };

type DirectoryUserResponse = {
  primaryEmail?: string;
  name?: { fullName?: string };
};

export type SyncedParticipantSession = {
  studentId: string | null;
  participantEmail: string | null;
  participantName: string | null;
  externalParticipantId: string | null;
  joinedAt: Date;
  leftAt: Date | null;
  totalMinutes: number;
};

export type SyncedConferenceContext = {
  meetingUrl: string | null;
  meetingCode: string | null;
  externalCalendarEventId: string | null;
  externalSpaceId: string | null;
  externalConferenceRecordId: string | null;
  actualStartAt: Date | null;
  actualEndAt: Date | null;
  participants: SyncedParticipantSession[];
};

@Injectable()
export class GoogleMeetProvider {
  private readonly calendarScopes = ['https://www.googleapis.com/auth/calendar'];
  private readonly meetScopes = ['https://www.googleapis.com/auth/meetings.space.readonly'];
  private readonly directoryScopes = ['https://www.googleapis.com/auth/admin.directory.user.readonly'];

  constructor(
    private readonly authService: GoogleWorkspaceAuthService,
    private readonly configService: ConfigService<AppConfiguration, true>,
  ) {}

  async createMeeting(
    session: OnlineClassSessionView,
    providerSetting: OnlineClassProviderSettingView,
  ): Promise<{
    meetingUrl: string | null;
    meetingCode: string | null;
    externalCalendarEventId: string | null;
  }> {
    this.ensureGoogleMeetEnabled(providerSetting);

    const calendarId =
      providerSetting.calendarId ||
      this.configService.get('googleWorkspace.defaultCalendarId', { infer: true }) ||
      'primary';
    const subject = providerSetting.impersonatedUserEmail || undefined;
    const accessToken = await this.authService.getAccessToken(this.calendarScopes, subject);

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId,
      )}/events?conferenceDataVersion=1&sendUpdates=none`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary: `${session.subjectName} · ${session.batchName}`,
          description: [
            `Organization: ${session.organizationName}`,
            `Teacher: ${session.teacherName ?? 'Not assigned'}`,
            `Session ID: ${session.id}`,
          ].join('\n'),
          start: { dateTime: session.scheduledStartAt.toISOString(), timeZone: 'UTC' },
          end: { dateTime: session.scheduledEndAt.toISOString(), timeZone: 'UTC' },
          conferenceData: {
            createRequest: {
              requestId: session.id,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        }),
      },
    );

    const data = (await response.json()) as CalendarEventResponse & {
      error?: { message?: string };
    };

    if (!response.ok) {
      throw new BadRequestException(data.error?.message || 'Google Calendar event creation failed');
    }

    const meetingUrl =
      data.hangoutLink ||
      data.conferenceData?.entryPoints?.find((entryPoint) => entryPoint.entryPointType === 'video')?.uri ||
      null;

    return {
      meetingUrl,
      meetingCode: data.conferenceData?.conferenceId ?? null,
      externalCalendarEventId: data.id ?? null,
    };
  }

  async syncParticipants(
    session: OnlineClassSessionView,
    providerSetting: OnlineClassProviderSettingView,
    resolveStudentIdByEmail: (email: string) => Promise<string | null>,
  ): Promise<SyncedConferenceContext> {
    this.ensureGoogleMeetEnabled(providerSetting);

    const subject = providerSetting.impersonatedUserEmail || undefined;
    const meetToken = await this.authService.getAccessToken(this.meetScopes, subject);
    const directoryToken = await this.authService.getAccessToken(this.directoryScopes, subject);

    const conferenceRecord = await this.resolveConferenceRecord(session, meetToken);
    const participants = await this.fetchJson<MeetParticipantListResponse>(
      `https://meet.googleapis.com/v2/${conferenceRecord.name}/participants`,
      meetToken,
    );

    const syncedParticipants: SyncedParticipantSession[] = [];
    for (const participant of participants.participants ?? []) {
      const sessionsResponse = await this.fetchJson<ParticipantSessionListResponse>(
        `https://meet.googleapis.com/v2/${participant.name}/participantSessions`,
        meetToken,
      );

      const participantEmail = participant.signedinUser?.user
        ? await this.resolvePrimaryEmail(participant.signedinUser.user, directoryToken)
        : null;
      const studentId = participantEmail ? await resolveStudentIdByEmail(participantEmail) : null;
      const participantName =
        participant.signedinUser?.displayName ||
        participant.anonymousUser?.displayName ||
        participant.phoneUser?.displayName ||
        null;

      for (const participantSession of sessionsResponse.participantSessions ?? []) {
        const joinedAt = new Date(participantSession.startTime);
        const leftAt = participantSession.endTime ? new Date(participantSession.endTime) : null;
        const totalMinutes = leftAt
          ? Math.max(1, Math.round((leftAt.getTime() - joinedAt.getTime()) / 60000))
          : 0;

        syncedParticipants.push({
          studentId,
          participantEmail,
          participantName,
          externalParticipantId: participant.name,
          joinedAt,
          leftAt,
          totalMinutes,
        });
      }
    }

    return {
      meetingUrl: session.meetingUrl,
      meetingCode: session.meetingCode,
      externalCalendarEventId: session.externalCalendarEventId,
      externalSpaceId: conferenceRecord.space ?? null,
      externalConferenceRecordId: conferenceRecord.name.split('/').pop() ?? null,
      actualStartAt: conferenceRecord.startTime ? new Date(conferenceRecord.startTime) : null,
      actualEndAt: conferenceRecord.endTime ? new Date(conferenceRecord.endTime) : null,
      participants: syncedParticipants,
    };
  }

  private ensureGoogleMeetEnabled(providerSetting: OnlineClassProviderSettingView): void {
    if (providerSetting.provider !== 'GOOGLE_MEET' || !providerSetting.integrationEnabled) {
      throw new BadRequestException('Google Meet integration is disabled for this organization');
    }
  }

  private async resolveConferenceRecord(
    session: OnlineClassSessionView,
    accessToken: string,
  ): Promise<ConferenceRecord> {
    if (session.externalConferenceRecordId) {
      return this.fetchJson<ConferenceRecord>(
        `https://meet.googleapis.com/v2/conferenceRecords/${encodeURIComponent(
          session.externalConferenceRecordId,
        )}`,
        accessToken,
      );
    }

    if (!session.meetingCode) {
      throw new BadRequestException('Meeting code is required before participants can be synced');
    }

    const filter = `space.meeting_code = "${session.meetingCode}"`;
    const response = await this.fetchJson<ConferenceListResponse>(
      `https://meet.googleapis.com/v2/conferenceRecords?filter=${encodeURIComponent(filter)}&pageSize=10`,
      accessToken,
    );
    const matchingRecord = (response.conferenceRecords ?? [])
      .filter((record) => record.startTime)
      .sort((left, right) => (right.startTime ?? '').localeCompare(left.startTime ?? ''))[0];

    if (!matchingRecord) {
      throw new BadRequestException('No Google Meet conference record was found for this meeting code');
    }

    return matchingRecord;
  }

  private async resolvePrimaryEmail(userResourceName: string, accessToken: string): Promise<string | null> {
    const directoryUserKey = userResourceName.split('/').pop();
    if (!directoryUserKey) {
      return null;
    }

    const response = await fetch(
      `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(directoryUserKey)}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as DirectoryUserResponse;
    return data.primaryEmail ?? null;
  }

  private async fetchJson<T>(url: string, accessToken: string): Promise<T> {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = (await response.json()) as T & { error?: { message?: string } };

    if (!response.ok) {
      throw new BadRequestException(data.error?.message || 'Google Workspace API request failed');
    }

    return data;
  }
}
