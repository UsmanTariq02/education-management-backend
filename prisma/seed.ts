import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DEFAULT_ORGANIZATION_MODULES } from '../src/common/enums/organization-module.enum';

const prisma = new PrismaClient();
const seededModules = DEFAULT_ORGANIZATION_MODULES as unknown as Parameters<typeof prisma.organization.upsert>[0]['create']['enabledModules'];

const permissions = [
  'users.create',
  'users.read',
  'users.update',
  'users.delete',
  'students.create',
  'students.read',
  'students.update',
  'students.delete',
  'portal-access.read',
  'portal-access.manage',
  'student-documents.read',
  'student-documents.manage',
  'organization-assets.read',
  'organization-assets.manage',
  'batches.create',
  'batches.read',
  'batches.update',
  'batches.delete',
  'academic-sessions.create',
  'academic-sessions.read',
  'academic-sessions.update',
  'academic-sessions.delete',
  'subjects.create',
  'subjects.read',
  'subjects.update',
  'subjects.delete',
  'teachers.create',
  'teachers.read',
  'teachers.update',
  'teachers.delete',
  'batch-subject-assignments.create',
  'batch-subject-assignments.read',
  'batch-subject-assignments.update',
  'batch-subject-assignments.delete',
  'timetables.create',
  'timetables.read',
  'timetables.update',
  'timetables.delete',
  'online-classes.create',
  'online-classes.read',
  'online-classes.update',
  'online-classes.delete',
  'online-classes.sync',
  'online-classes.attendance',
  'exams.create',
  'exams.read',
  'exams.update',
  'exams.delete',
  'exam-results.create',
  'exam-results.read',
  'exam-results.update',
  'exam-results.delete',
  'fees.create',
  'fees.read',
  'fees.update',
  'fees.delete',
  'attendance.create',
  'attendance.read',
  'attendance.update',
  'attendance.delete',
  'reminders.create',
  'reminders.read',
  'reminders.update',
  'reminders.delete',
  'reports.read',
  'activity-logs.read',
  'settings.update',
] as const;

async function main(): Promise<void> {
  const defaultOrganization = await prisma.organization.upsert({
    where: { slug: 'default-academy' },
    update: {
      name: 'Default Academy',
      email: 'info@default-academy.edu.local',
      phone: '03000000000',
      isActive: true,
      userLimit: 25,
      studentLimit: 1000,
      enabledModules: seededModules,
    },
    create: {
      name: 'Default Academy',
      slug: 'default-academy',
      email: 'info@default-academy.edu.local',
      phone: '03000000000',
      address: 'Default campus',
      isActive: true,
      userLimit: 25,
      studentLimit: 1000,
      enabledModules: seededModules,
    },
  });

  const permissionRecords = await Promise.all(
    permissions.map((name) =>
      prisma.permission.upsert({
        where: { name },
        update: { description: `${name} permission` },
        create: { name, description: `${name} permission` },
      }),
    ),
  );

  const superAdminRole = await prisma.role.upsert({
    where: { name: 'SUPER_ADMIN' },
    update: { description: 'System super administrator' },
    create: { name: 'SUPER_ADMIN', description: 'System super administrator' },
  });

  const adminRole = await prisma.role.upsert({
    where: { name: 'ADMIN' },
    update: { description: 'Operational administrator' },
    create: { name: 'ADMIN', description: 'Operational administrator' },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: 'STAFF' },
    update: { description: 'Restricted staff user' },
    create: { name: 'STAFF', description: 'Restricted staff user' },
  });

  const academicCoordinatorRole = await prisma.role.upsert({
    where: { name: 'ACADEMIC_COORDINATOR' },
    update: { description: 'Academic planning and coordination user' },
    create: { name: 'ACADEMIC_COORDINATOR', description: 'Academic planning and coordination user' },
  });

  const teacherRole = await prisma.role.upsert({
    where: { name: 'TEACHER' },
    update: { description: 'Teacher-facing academic and attendance user' },
    create: { name: 'TEACHER', description: 'Teacher-facing academic and attendance user' },
  });

  await prisma.role.upsert({
    where: { name: 'STUDENT' },
    update: { description: 'Student portal identity role reference' },
    create: { name: 'STUDENT', description: 'Student portal identity role reference' },
  });

  await prisma.role.upsert({
    where: { name: 'PARENT' },
    update: { description: 'Parent portal identity role reference' },
    create: { name: 'PARENT', description: 'Parent portal identity role reference' },
  });

  const adminPermissionNames = permissionRecords
    .filter((permission) => permission.name !== 'users.delete' && permission.name !== 'settings.update')
    .map((permission) => permission.name);

  const staffPermissionNames = permissionRecords
    .filter((permission) =>
      ['students.read', 'batches.read', 'fees.read', 'attendance.create', 'attendance.read', 'reminders.read', 'student-documents.read'].includes(
        permission.name,
      ) ||
      ['academic-sessions.read', 'subjects.read', 'teachers.read', 'organization-assets.read'].includes(
        permission.name,
      ),
    )
    .map((permission) => permission.name);

  const academicCoordinatorPermissionNames = permissionRecords
    .filter((permission) =>
      [
        'students.read',
        'students.update',
        'portal-access.read',
        'portal-access.manage',
        'student-documents.read',
        'student-documents.manage',
        'organization-assets.read',
        'organization-assets.manage',
        'batches.read',
        'academic-sessions.create',
        'academic-sessions.read',
        'academic-sessions.update',
        'subjects.create',
        'subjects.read',
        'subjects.update',
        'teachers.create',
        'teachers.read',
        'teachers.update',
        'batch-subject-assignments.create',
        'batch-subject-assignments.read',
        'batch-subject-assignments.update',
        'timetables.create',
        'timetables.read',
        'timetables.update',
        'online-classes.create',
        'online-classes.read',
        'online-classes.update',
        'online-classes.sync',
        'online-classes.attendance',
        'exams.create',
        'exams.read',
        'exams.update',
        'exam-results.create',
        'exam-results.read',
        'exam-results.update',
        'attendance.create',
        'attendance.read',
        'attendance.update',
        'reports.read',
      ].includes(permission.name),
    )
    .map((permission) => permission.name);

  const teacherPermissionNames = permissionRecords
    .filter((permission) =>
      [
        'students.read',
        'batches.read',
        'portal-access.read',
        'student-documents.read',
        'organization-assets.read',
        'academic-sessions.read',
        'subjects.read',
        'teachers.read',
        'batch-subject-assignments.read',
        'timetables.read',
        'online-classes.read',
        'exams.read',
        'exam-results.read',
        'exam-results.create',
        'exam-results.update',
        'attendance.create',
        'attendance.read',
        'attendance.update',
        'reports.read',
      ].includes(permission.name),
    )
    .map((permission) => permission.name);

  await prisma.rolePermission.deleteMany();

  for (const permission of permissionRecords) {
    await prisma.rolePermission.create({
      data: {
        roleId: superAdminRole.id,
        permissionId: permission.id,
      },
    });
  }

  for (const permission of permissionRecords.filter((item) => adminPermissionNames.includes(item.name))) {
    await prisma.rolePermission.create({
      data: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  for (const permission of permissionRecords.filter((item) => staffPermissionNames.includes(item.name))) {
    await prisma.rolePermission.create({
      data: {
        roleId: staffRole.id,
        permissionId: permission.id,
      },
    });
  }

  for (const permission of permissionRecords.filter((item) => academicCoordinatorPermissionNames.includes(item.name))) {
    await prisma.rolePermission.create({
      data: {
        roleId: academicCoordinatorRole.id,
        permissionId: permission.id,
      },
    });
  }

  for (const permission of permissionRecords.filter((item) => teacherPermissionNames.includes(item.name))) {
    await prisma.rolePermission.create({
      data: {
        roleId: teacherRole.id,
        permissionId: permission.id,
      },
    });
  }

  const passwordHash = await bcrypt.hash('ChangeMe123!', 12);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@edu.local' },
    update: {
      firstName: 'Super',
      lastName: 'Admin',
      passwordHash,
      isActive: true,
      organizationId: null,
    },
    create: {
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@edu.local',
      passwordHash,
      isActive: true,
      organizationId: null,
    },
  });

  const defaultAdmin = await prisma.user.upsert({
    where: { email: 'admin@default-academy.edu.local' },
    update: {
      firstName: 'Default',
      lastName: 'Admin',
      passwordHash,
      isActive: true,
      organizationId: defaultOrganization.id,
    },
    create: {
      firstName: 'Default',
      lastName: 'Admin',
      email: 'admin@default-academy.edu.local',
      passwordHash,
      isActive: true,
      organizationId: defaultOrganization.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: superAdmin.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: superAdmin.id,
      roleId: superAdminRole.id,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: defaultAdmin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: defaultAdmin.id,
      roleId: adminRole.id,
    },
  });

  await prisma.reminderProviderSetting.upsert({
    where: { organizationId: defaultOrganization.id },
    update: {
      autoRemindersEnabled: false,
      emailEnabled: false,
      whatsappEnabled: false,
      smsEnabled: false,
      paymentConfirmationEnabled: false,
      senderName: 'Default Academy',
      replyToEmail: 'info@default-academy.edu.local',
    },
    create: {
      organizationId: defaultOrganization.id,
      autoRemindersEnabled: false,
      emailEnabled: false,
      whatsappEnabled: false,
      smsEnabled: false,
      paymentConfirmationEnabled: false,
      senderName: 'Default Academy',
      replyToEmail: 'info@default-academy.edu.local',
    },
  });

  const overdueWhatsappTemplate = await prisma.reminderTemplate.upsert({
    where: {
      organizationId_code_channel: {
        organizationId: defaultOrganization.id,
        code: 'fee-overdue-guardian',
        channel: 'WHATSAPP',
      },
    },
    update: {
      name: 'Fee overdue reminder',
      target: 'GUARDIAN',
      body:
        'Assalam o Alaikum {{guardianName}}, this is a fee reminder from {{organizationName}} for {{studentName}}. Billing cycle: {{billingCycle}}. Total fee: {{totalFee}}. Paid fee: {{paidFee}}. Pending fee: {{pendingFee}}. Due date: {{dueDate}}. Please contact the school administration if payment has already been made or if you need any clarification.',
      isActive: true,
    },
    create: {
      organizationId: defaultOrganization.id,
      name: 'Fee overdue reminder',
      code: 'fee-overdue-guardian',
      channel: 'WHATSAPP',
      target: 'GUARDIAN',
      body:
        'Assalam o Alaikum {{guardianName}}, this is a fee reminder from {{organizationName}} for {{studentName}}. Billing cycle: {{billingCycle}}. Total fee: {{totalFee}}. Paid fee: {{paidFee}}. Pending fee: {{pendingFee}}. Due date: {{dueDate}}. Please contact the school administration if payment has already been made or if you need any clarification.',
      isActive: true,
    },
  });

  const overdueEmailTemplate = await prisma.reminderTemplate.upsert({
    where: {
      organizationId_code_channel: {
        organizationId: defaultOrganization.id,
        code: 'fee-overdue-email',
        channel: 'EMAIL',
      },
    },
    update: {
      name: 'Fee overdue email',
      target: 'STUDENT',
      subject: 'Fee reminder for {{studentName}}',
      body:
        'Dear {{guardianName}}, this is a fee reminder from {{organizationName}} for {{studentName}}. Billing cycle: {{billingCycle}}. Total fee: {{totalFee}}. Paid fee: {{paidFee}}. Pending fee: {{pendingFee}}. Due date: {{dueDate}}. Please contact the school administration if payment has already been made or if you need any clarification.',
      isActive: true,
    },
    create: {
      organizationId: defaultOrganization.id,
      name: 'Fee overdue email',
      code: 'fee-overdue-email',
      channel: 'EMAIL',
      target: 'STUDENT',
      subject: 'Fee reminder for {{studentName}}',
      body:
        'Dear {{guardianName}}, this is a fee reminder from {{organizationName}} for {{studentName}}. Billing cycle: {{billingCycle}}. Total fee: {{totalFee}}. Paid fee: {{paidFee}}. Pending fee: {{pendingFee}}. Due date: {{dueDate}}. Please contact the school administration if payment has already been made or if you need any clarification.',
      isActive: true,
    },
  });

  const paymentReceiptTemplate = await prisma.reminderTemplate.upsert({
    where: {
      organizationId_code_channel: {
        organizationId: defaultOrganization.id,
        code: 'payment-received-email',
        channel: 'EMAIL',
      },
    },
    update: {
      name: 'Payment received confirmation',
      target: 'STUDENT',
      subject: 'Payment received from {{organizationName}}',
      body:
        'Dear {{guardianName}}, this is a payment confirmation from {{organizationName}} for {{studentName}}. Billing cycle: {{billingCycle}}. Total fee: {{totalFee}}. Paid fee received: {{paidFee}}. Pending fee: {{pendingFee}}. Thank you for your cooperation.',
      isActive: true,
    },
    create: {
      organizationId: defaultOrganization.id,
      name: 'Payment received confirmation',
      code: 'payment-received-email',
      channel: 'EMAIL',
      target: 'STUDENT',
      subject: 'Payment received from {{organizationName}}',
      body:
        'Dear {{guardianName}}, this is a payment confirmation from {{organizationName}} for {{studentName}}. Billing cycle: {{billingCycle}}. Total fee: {{totalFee}}. Paid fee received: {{paidFee}}. Pending fee: {{pendingFee}}. Thank you for your cooperation.',
      isActive: true,
    },
  });

  await prisma.reminderRule.deleteMany({
    where: {
      organizationId: defaultOrganization.id,
      name: {
        in: ['Overdue WhatsApp after 1 day', 'Overdue email after 3 days', 'Payment received email'],
      },
    },
  });

  await prisma.reminderRule.createMany({
    data: [
      {
        organizationId: defaultOrganization.id,
        templateId: overdueWhatsappTemplate.id,
        name: 'Overdue WhatsApp after 1 day',
        trigger: 'FEE_OVERDUE',
        offsetDays: 1,
        isActive: true,
      },
      {
        organizationId: defaultOrganization.id,
        templateId: overdueEmailTemplate.id,
        name: 'Overdue email after 3 days',
        trigger: 'FEE_OVERDUE',
        offsetDays: 3,
        isActive: true,
      },
      {
        organizationId: defaultOrganization.id,
        templateId: paymentReceiptTemplate.id,
        name: 'Payment received email',
        trigger: 'PAYMENT_RECEIVED',
        offsetDays: 0,
        isActive: true,
      },
    ],
  });
}

main()
  .catch(async (error: unknown) => {
    console.error('Seed failed', error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
