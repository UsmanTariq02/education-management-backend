ALTER TABLE "Organization"
ALTER COLUMN "enabledModules"
SET DEFAULT ARRAY[
  'USERS',
  'STUDENTS',
  'PORTALS',
  'BATCHES',
  'ACADEMICS',
  'FEES',
  'ATTENDANCE',
  'REMINDERS',
  'REPORTS',
  'ACTIVITY_LOGS',
  'SETTINGS',
  'MEDIA'
]::"OrganizationModule"[];

UPDATE "Organization"
SET "enabledModules" = ARRAY(
  SELECT DISTINCT module_value
  FROM unnest("enabledModules" || ARRAY['PORTALS', 'MEDIA']::"OrganizationModule"[]) AS module_value
);
