export enum OrganizationModule {
  USERS = 'USERS',
  STUDENTS = 'STUDENTS',
  PORTALS = 'PORTALS',
  BATCHES = 'BATCHES',
  ACADEMICS = 'ACADEMICS',
  FEES = 'FEES',
  ATTENDANCE = 'ATTENDANCE',
  REMINDERS = 'REMINDERS',
  REPORTS = 'REPORTS',
  ACTIVITY_LOGS = 'ACTIVITY_LOGS',
  SETTINGS = 'SETTINGS',
  MEDIA = 'MEDIA',
}

export const DEFAULT_ORGANIZATION_MODULES: OrganizationModule[] = [
  OrganizationModule.USERS,
  OrganizationModule.STUDENTS,
  OrganizationModule.PORTALS,
  OrganizationModule.BATCHES,
  OrganizationModule.ACADEMICS,
  OrganizationModule.FEES,
  OrganizationModule.ATTENDANCE,
  OrganizationModule.REMINDERS,
  OrganizationModule.REPORTS,
  OrganizationModule.ACTIVITY_LOGS,
  OrganizationModule.SETTINGS,
  OrganizationModule.MEDIA,
];
