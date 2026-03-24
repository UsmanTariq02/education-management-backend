import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DEFAULT_ORGANIZATION_MODULES } from '../src/common/enums/organization-module.enum';

const prisma = new PrismaClient();

const permissions = [
  'users.create',
  'users.read',
  'users.update',
  'users.delete',
  'students.create',
  'students.read',
  'students.update',
  'students.delete',
  'batches.create',
  'batches.read',
  'batches.update',
  'batches.delete',
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
      enabledModules: DEFAULT_ORGANIZATION_MODULES,
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
      enabledModules: DEFAULT_ORGANIZATION_MODULES,
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

  const adminPermissionNames = permissionRecords
    .filter((permission) => permission.name !== 'users.delete' && permission.name !== 'settings.update')
    .map((permission) => permission.name);

  const staffPermissionNames = permissionRecords
    .filter((permission) =>
      ['students.read', 'batches.read', 'fees.read', 'attendance.create', 'attendance.read', 'reminders.read'].includes(
        permission.name,
      ),
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
