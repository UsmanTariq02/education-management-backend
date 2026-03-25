ALTER TABLE "Organization"
  ALTER COLUMN "enabledModules"
  SET DEFAULT ARRAY[
    'USERS',
    'STUDENTS',
    'BATCHES',
    'ACADEMICS',
    'FEES',
    'ATTENDANCE',
    'REMINDERS',
    'REPORTS',
    'ACTIVITY_LOGS',
    'SETTINGS'
  ]::"OrganizationModule"[];

UPDATE "Organization"
SET "enabledModules" = array_append("enabledModules", 'ACADEMICS'::"OrganizationModule")
WHERE NOT ('ACADEMICS'::"OrganizationModule" = ANY("enabledModules"));
