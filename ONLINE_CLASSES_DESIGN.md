# Online Classes Design

## Provider Choice
- Primary provider: `Google Meet`
- Secondary provider: `Zoom`

Why `Google Meet` first:
- Meet now exposes REST resources around meeting spaces, conference records, participants, and participant sessions.
- Google Calendar fits naturally with recurring academic schedule creation and school workflows.
- This product already depends heavily on structured schedules, sessions, attendance, and portal visibility rather than embedded webinar tooling.

Official references:
- Meet API overview: https://developers.google.com/meet/api/guides/overview
- Meet conference records and participants: https://developers.google.com/workspace/meet/api/guides/conferences
- Calendar event creation: https://developers.google.com/workspace/calendar/api/guides/create-events

## Product Rules
- Online attendance is automatic only when there is a scheduled online class.
- If there is no scheduled online class, teachers continue to mark attendance manually.
- Presence should not be marked only because a meeting exists.
- Presence should be marked only after:
  - a matching scheduled class exists
  - the participant is matched to a student
  - the join duration crosses a configurable minimum threshold

## Data Model
- `TimetableEntry`
  - now supports delivery mode, provider, meeting URL/code, and auto-attendance threshold
- `OnlineClassSession`
  - one scheduled or actual online class occurrence
- `OnlineClassParticipantSession`
  - one participant’s actual join/leave session
- `Attendance`
  - now tracks whether it was created manually or from online class automation

## Intended Flow
1. Admin or academic coordinator creates an online-capable timetable entry.
2. A scheduled class occurrence is created from that timetable entry.
3. Provider sync pulls participant sessions from Meet.
4. Participant email/account is matched to a student.
5. If threshold is met, attendance is auto-created as `ONLINE_CLASS`.
6. Teacher/admin can still review or override attendance operationally.

## Matching Strategy
- Prefer student email for direct matching.
- Fallback to guardian email only if portal or attendance policy explicitly allows it.
- Keep unmatched participants for manual review instead of auto-marking them.

## V1 Scope
- Schedule-aware online class metadata
- Provider-agnostic session storage
- Auto-attendance readiness with manual attendance fallback

## Next Implementation Slice
- Meet service adapter
- Schedule-to-session generation
- Participant sync job
- Attendance automation service
- Online class operations page in academics
