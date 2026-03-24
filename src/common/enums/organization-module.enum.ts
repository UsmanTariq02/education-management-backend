export enum OrganizationModule {
  USERS = 'USERS',
  STUDENTS = 'STUDENTS',
  BATCHES = 'BATCHES',
  FEES = 'FEES',
  ATTENDANCE = 'ATTENDANCE',
  REMINDERS = 'REMINDERS',
  REPORTS = 'REPORTS',
  ACTIVITY_LOGS = 'ACTIVITY_LOGS',
  SETTINGS = 'SETTINGS',
}

export const DEFAULT_ORGANIZATION_MODULES: OrganizationModule[] = [
  OrganizationModule.USERS,
  OrganizationModule.STUDENTS,
  OrganizationModule.BATCHES,
  OrganizationModule.FEES,
  OrganizationModule.ATTENDANCE,
  OrganizationModule.REMINDERS,
  OrganizationModule.REPORTS,
  OrganizationModule.ACTIVITY_LOGS,
  OrganizationModule.SETTINGS,
];
