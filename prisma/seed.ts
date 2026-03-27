import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DEFAULT_ORGANIZATION_MODULES } from '../src/common/enums/organization-module.enum';

const prisma = new PrismaClient();
const seededModules = DEFAULT_ORGANIZATION_MODULES as unknown as Parameters<typeof prisma.organization.upsert>[0]['create']['enabledModules'];
const sharedPassword = 'ChangeMe123!';

const permissions = [
  'users.create',
  'users.read',
  'users.update',
  'users.delete',
  'students.create',
  'students.read',
  'students.update',
  'students.delete',
  'portal-dashboard.read',
  'portal-profile.read',
  'portal-fees.read',
  'portal-attendance.read',
  'portal-results.read',
  'portal-timetable.read',
  'portal-reminders.read',
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

async function ensureUserRole(userId: string, roleId: string): Promise<void> {
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId,
        roleId,
      },
    },
    update: {},
    create: {
      userId,
      roleId,
    },
  });
}

async function resetDemoOrganizationData(organizationId: string): Promise<void> {
  await prisma.onlineClassParticipantSession.deleteMany({ where: { organizationId } });
  await prisma.onlineClassSession.deleteMany({ where: { organizationId } });
  await prisma.attendance.deleteMany({ where: { organizationId } });
  await prisma.reminderSchedule.deleteMany({ where: { organizationId } });
  await prisma.reminderLog.deleteMany({ where: { organizationId } });
  await prisma.feeRecord.deleteMany({ where: { organizationId } });
  await prisma.feePlan.deleteMany({ where: { organizationId } });
  await prisma.studentExamResultItem.deleteMany({ where: { organizationId } });
  await prisma.studentExamResult.deleteMany({ where: { organizationId } });
  await prisma.examSubject.deleteMany({ where: { exam: { organizationId } } });
  await prisma.exam.deleteMany({ where: { organizationId } });
  await prisma.timetableEntry.deleteMany({ where: { organizationId } });
  await prisma.batchSubjectAssignment.deleteMany({ where: { organizationId } });
  await prisma.portalAccount.deleteMany({ where: { organizationId } });
  await prisma.studentBatch.deleteMany({ where: { batch: { organizationId } } });
  await prisma.studentDocument.deleteMany({ where: { organizationId } });
  await prisma.organizationAsset.deleteMany({ where: { organizationId } });
  await prisma.student.deleteMany({ where: { organizationId } });
  await prisma.teacher.deleteMany({ where: { organizationId } });
  await prisma.subject.deleteMany({ where: { organizationId } });
  await prisma.academicSession.deleteMany({ where: { organizationId } });
  await prisma.batch.deleteMany({ where: { organizationId } });
  await prisma.reminderRule.deleteMany({ where: { organizationId } });
  await prisma.reminderTemplate.deleteMany({ where: { organizationId } });
  await prisma.reminderProviderSetting.deleteMany({ where: { organizationId } });
  await prisma.onlineClassProviderSetting.deleteMany({ where: { organizationId } });
  await prisma.user.deleteMany({
    where: {
      organizationId,
      email: {
        in: [
          'admin@green-valley-demo.edu',
          'academics@green-valley-demo.edu',
          'staff@green-valley-demo.edu',
          'teacher.sara@green-valley-demo.edu',
        ],
      },
    },
  });
}

async function seedDemoOrganization(params: {
  adminRoleId: string;
  staffRoleId: string;
  academicCoordinatorRoleId: string;
  teacherRoleId: string;
}): Promise<void> {
  const organization = await prisma.organization.upsert({
    where: { slug: 'green-valley-demo' },
    update: {
      name: 'Green Valley Demo School',
      email: 'info@green-valley-demo.edu',
      phone: '03011222333',
      address: 'Main Boulevard, Lahore',
      isActive: true,
      userLimit: 40,
      studentLimit: 800,
      enabledModules: seededModules,
    },
    create: {
      name: 'Green Valley Demo School',
      slug: 'green-valley-demo',
      email: 'info@green-valley-demo.edu',
      phone: '03011222333',
      address: 'Main Boulevard, Lahore',
      isActive: true,
      userLimit: 40,
      studentLimit: 800,
      enabledModules: seededModules,
    },
  });

  await resetDemoOrganizationData(organization.id);

  const passwordHash = await bcrypt.hash(sharedPassword, 12);
  const adminUser = await prisma.user.create({
    data: {
      organizationId: organization.id,
      firstName: 'Ayesha',
      lastName: 'Rahman',
      email: 'admin@green-valley-demo.edu',
      passwordHash,
      isActive: true,
    },
  });
  const academicsUser = await prisma.user.create({
    data: {
      organizationId: organization.id,
      firstName: 'Bilal',
      lastName: 'Ahmed',
      email: 'academics@green-valley-demo.edu',
      passwordHash,
      isActive: true,
    },
  });
  const staffUser = await prisma.user.create({
    data: {
      organizationId: organization.id,
      firstName: 'Hina',
      lastName: 'Akram',
      email: 'staff@green-valley-demo.edu',
      passwordHash,
      isActive: true,
    },
  });
  const teacherUser = await prisma.user.create({
    data: {
      organizationId: organization.id,
      firstName: 'Sara',
      lastName: 'Khan',
      email: 'teacher.sara@green-valley-demo.edu',
      passwordHash,
      isActive: true,
    },
  });

  await ensureUserRole(adminUser.id, params.adminRoleId);
  await ensureUserRole(academicsUser.id, params.academicCoordinatorRoleId);
  await ensureUserRole(staffUser.id, params.staffRoleId);
  await ensureUserRole(teacherUser.id, params.teacherRoleId);

  await prisma.reminderProviderSetting.create({
    data: {
      organizationId: organization.id,
      autoRemindersEnabled: true,
      emailEnabled: true,
      whatsappEnabled: true,
      smsEnabled: false,
      paymentConfirmationEnabled: true,
      senderName: 'Green Valley Demo School',
      replyToEmail: 'accounts@green-valley-demo.edu',
    },
  });

  const academicSession = await prisma.academicSession.create({
    data: {
      organizationId: organization.id,
      name: 'Session 2026-27',
      code: 'SESSION-2026-27',
      description: 'Demo academic session for product walkthroughs.',
      startDate: new Date('2026-04-01T00:00:00.000Z'),
      endDate: new Date('2027-03-31T00:00:00.000Z'),
      isCurrent: true,
      isActive: true,
    },
  });

  const batch = await prisma.batch.create({
    data: {
      organizationId: organization.id,
      name: 'Grade 8 - Blue',
      code: 'G8-BLUE',
      description: 'Demo middle school batch',
      startDate: new Date('2026-04-03T00:00:00.000Z'),
      scheduleInfo: 'Monday to Friday · 08:30 AM to 01:30 PM',
      isActive: true,
    },
  });

  const [english, mathematics, science] = await Promise.all([
    prisma.subject.create({
      data: {
        organizationId: organization.id,
        name: 'English',
        code: 'ENG-8',
        description: 'Language and comprehension',
        isActive: true,
      },
    }),
    prisma.subject.create({
      data: {
        organizationId: organization.id,
        name: 'Mathematics',
        code: 'MTH-8',
        description: 'Core mathematics for grade 8',
        isActive: true,
      },
    }),
    prisma.subject.create({
      data: {
        organizationId: organization.id,
        name: 'General Science',
        code: 'SCI-8',
        description: 'Integrated science track',
        isActive: true,
      },
    }),
  ]);

  const [teacherSara, teacherUsman] = await Promise.all([
    prisma.teacher.create({
      data: {
        organizationId: organization.id,
        employeeId: 'T-1001',
        firstName: 'Sara',
        lastName: 'Khan',
        fullName: 'Sara Khan',
        email: 'teacher.sara@green-valley-demo.edu',
        phone: '03015554444',
        qualification: 'MPhil English',
        specialization: 'English',
        joinedAt: new Date('2025-08-01T00:00:00.000Z'),
        isActive: true,
      },
    }),
    prisma.teacher.create({
      data: {
        organizationId: organization.id,
        employeeId: 'T-1002',
        firstName: 'Usman',
        lastName: 'Farooq',
        fullName: 'Usman Farooq',
        email: 'teacher.usman@green-valley-demo.edu',
        phone: '03016665555',
        qualification: 'MSc Mathematics',
        specialization: 'Mathematics',
        joinedAt: new Date('2025-08-01T00:00:00.000Z'),
        isActive: true,
      },
    }),
  ]);

  await prisma.batchSubjectAssignment.createMany({
    data: [
      {
        organizationId: organization.id,
        academicSessionId: academicSession.id,
        batchId: batch.id,
        subjectId: english.id,
        teacherId: teacherSara.id,
        weeklyClasses: 4,
        isPrimary: true,
        isActive: true,
      },
      {
        organizationId: organization.id,
        academicSessionId: academicSession.id,
        batchId: batch.id,
        subjectId: mathematics.id,
        teacherId: teacherUsman.id,
        weeklyClasses: 5,
        isPrimary: true,
        isActive: true,
      },
      {
        organizationId: organization.id,
        academicSessionId: academicSession.id,
        batchId: batch.id,
        subjectId: science.id,
        teacherId: teacherUsman.id,
        weeklyClasses: 3,
        isPrimary: false,
        isActive: true,
      },
    ],
  });

  await prisma.timetableEntry.createMany({
    data: [
      {
        organizationId: organization.id,
        academicSessionId: academicSession.id,
        batchId: batch.id,
        subjectId: english.id,
        teacherId: teacherSara.id,
        dayOfWeek: 'MONDAY',
        startTime: '09:00',
        endTime: '09:45',
        deliveryMode: 'OFFLINE',
        room: 'Room 8-A',
        isActive: true,
      },
      {
        organizationId: organization.id,
        academicSessionId: academicSession.id,
        batchId: batch.id,
        subjectId: mathematics.id,
        teacherId: teacherUsman.id,
        dayOfWeek: 'TUESDAY',
        startTime: '10:00',
        endTime: '10:45',
        deliveryMode: 'ONLINE',
        onlineClassProvider: 'GOOGLE_MEET',
        autoAttendanceEnabled: true,
        attendanceJoinThresholdMinutes: 5,
        notes: 'Demo online math class',
        isActive: true,
      },
      {
        organizationId: organization.id,
        academicSessionId: academicSession.id,
        batchId: batch.id,
        subjectId: science.id,
        teacherId: teacherUsman.id,
        dayOfWeek: 'WEDNESDAY',
        startTime: '11:00',
        endTime: '11:45',
        deliveryMode: 'OFFLINE',
        room: 'Science Lab',
        isActive: true,
      },
    ],
  });

  const students = await Promise.all(
    [
      {
        firstName: 'Ali',
        lastName: 'Raza',
        fullName: 'Ali Raza',
        email: 'ali.raza@student.green-valley-demo.edu',
        phone: '03020000001',
        guardianName: 'Raza Hussain',
        guardianEmail: 'raza.hussain@example.com',
        guardianPhone: '03021110001',
        address: 'Model Town, Lahore',
        dateOfBirth: new Date('2012-02-12T00:00:00.000Z'),
      },
      {
        firstName: 'Areeba',
        lastName: 'Noor',
        fullName: 'Areeba Noor',
        email: 'areeba.noor@student.green-valley-demo.edu',
        phone: '03020000002',
        guardianName: 'Noor Fatima',
        guardianEmail: 'noor.fatima@example.com',
        guardianPhone: '03021110002',
        address: 'Johar Town, Lahore',
        dateOfBirth: new Date('2012-05-20T00:00:00.000Z'),
      },
      {
        firstName: 'Hamza',
        lastName: 'Saeed',
        fullName: 'Hamza Saeed',
        email: 'hamza.saeed@student.green-valley-demo.edu',
        phone: '03020000003',
        guardianName: 'Saeed Ahmed',
        guardianEmail: 'saeed.ahmed@example.com',
        guardianPhone: '03021110003',
        address: 'Wapda Town, Lahore',
        dateOfBirth: new Date('2011-11-03T00:00:00.000Z'),
      },
    ].map((student) =>
      prisma.student.create({
        data: {
          organizationId: organization.id,
          ...student,
          admissionDate: new Date('2026-04-05T00:00:00.000Z'),
          status: 'ACTIVE',
        },
      }),
    ),
  );

  await prisma.studentBatch.createMany({
    data: students.map((student) => ({
      studentId: student.id,
      batchId: batch.id,
      joinedAt: new Date('2026-04-05T00:00:00.000Z'),
      status: 'ACTIVE',
    })),
  });

  const feePlans = await Promise.all(
    students.map((student) =>
      prisma.feePlan.create({
        data: {
          organizationId: organization.id,
          studentId: student.id,
          batchId: batch.id,
          monthlyFee: 8500,
          dueDay: 10,
          isActive: true,
        },
      }),
    ),
  );

  await prisma.feeRecord.createMany({
    data: [
      {
        organizationId: organization.id,
        studentId: students[0].id,
        batchId: batch.id,
        feePlanId: feePlans[0].id,
        month: 3,
        year: 2026,
        amountDue: 8500,
        amountPaid: 8500,
        status: 'PAID',
        paidAt: new Date('2026-03-09T09:00:00.000Z'),
        paymentMethod: 'BANK_TRANSFER',
        remarks: 'Paid in full',
      },
      {
        organizationId: organization.id,
        studentId: students[1].id,
        batchId: batch.id,
        feePlanId: feePlans[1].id,
        month: 3,
        year: 2026,
        amountDue: 8500,
        amountPaid: 4500,
        status: 'PARTIAL',
        paidAt: new Date('2026-03-11T09:00:00.000Z'),
        paymentMethod: 'CASH',
        remarks: 'Partial payment received',
      },
      {
        organizationId: organization.id,
        studentId: students[2].id,
        batchId: batch.id,
        feePlanId: feePlans[2].id,
        month: 3,
        year: 2026,
        amountDue: 8500,
        amountPaid: 0,
        status: 'OVERDUE',
        remarks: 'Pending demo overdue fee',
      },
    ],
  });

  const attendanceDates = [
    new Date('2026-04-06T00:00:00.000Z'),
    new Date('2026-04-07T00:00:00.000Z'),
    new Date('2026-04-08T00:00:00.000Z'),
  ];

  await prisma.attendance.createMany({
    data: [
      { organizationId: organization.id, studentId: students[0].id, batchId: batch.id, attendanceDate: attendanceDates[0], status: 'PRESENT', source: 'MANUAL' },
      { organizationId: organization.id, studentId: students[1].id, batchId: batch.id, attendanceDate: attendanceDates[0], status: 'PRESENT', source: 'MANUAL' },
      { organizationId: organization.id, studentId: students[2].id, batchId: batch.id, attendanceDate: attendanceDates[0], status: 'ABSENT', source: 'MANUAL', remarks: 'Sick leave pending note' },
      { organizationId: organization.id, studentId: students[0].id, batchId: batch.id, attendanceDate: attendanceDates[1], status: 'LATE', source: 'MANUAL' },
      { organizationId: organization.id, studentId: students[1].id, batchId: batch.id, attendanceDate: attendanceDates[1], status: 'PRESENT', source: 'MANUAL' },
      { organizationId: organization.id, studentId: students[2].id, batchId: batch.id, attendanceDate: attendanceDates[1], status: 'PRESENT', source: 'MANUAL' },
      { organizationId: organization.id, studentId: students[0].id, batchId: batch.id, attendanceDate: attendanceDates[2], status: 'PRESENT', source: 'MANUAL' },
      { organizationId: organization.id, studentId: students[1].id, batchId: batch.id, attendanceDate: attendanceDates[2], status: 'LEAVE', source: 'MANUAL', remarks: 'Family event' },
      { organizationId: organization.id, studentId: students[2].id, batchId: batch.id, attendanceDate: attendanceDates[2], status: 'PRESENT', source: 'MANUAL' },
    ],
  });

  const exam = await prisma.exam.create({
    data: {
      organizationId: organization.id,
      academicSessionId: academicSession.id,
      batchId: batch.id,
      teacherId: teacherSara.id,
      name: 'First Term Assessment',
      code: 'FTA-2026-G8',
      description: 'Demo published exam',
      examDate: new Date('2026-04-15T00:00:00.000Z'),
      isPublished: true,
    },
  });

  const examSubjects = await Promise.all([
    prisma.examSubject.create({ data: { examId: exam.id, subjectId: english.id, totalMarks: 100, passMarks: 40 } }),
    prisma.examSubject.create({ data: { examId: exam.id, subjectId: mathematics.id, totalMarks: 100, passMarks: 40 } }),
    prisma.examSubject.create({ data: { examId: exam.id, subjectId: science.id, totalMarks: 100, passMarks: 40 } }),
  ]);

  const resultBlueprints = [
    { student: students[0], marks: [84, 91, 88], percentage: 87.67, grade: 'A', remarks: 'Consistent performance' },
    { student: students[1], marks: [74, 79, 81], percentage: 78, grade: 'B+', remarks: 'Steady and improving' },
    { student: students[2], marks: [61, 58, 65], percentage: 61.33, grade: 'C+', remarks: 'Needs support in mathematics' },
  ];

  for (const blueprint of resultBlueprints) {
    const result = await prisma.studentExamResult.create({
      data: {
        organizationId: organization.id,
        academicSessionId: academicSession.id,
        examId: exam.id,
        studentId: blueprint.student.id,
        batchId: batch.id,
        totalObtained: blueprint.marks.reduce((sum, value) => sum + value, 0),
        percentage: blueprint.percentage,
        grade: blueprint.grade,
        remarks: blueprint.remarks,
        status: 'PUBLISHED',
        publishedAt: new Date('2026-04-18T10:00:00.000Z'),
      },
    });

    await prisma.studentExamResultItem.createMany({
      data: examSubjects.map((examSubject, index) => ({
        organizationId: organization.id,
        resultId: result.id,
        examSubjectId: examSubject.id,
        subjectId: examSubject.subjectId,
        obtainedMarks: blueprint.marks[index],
        grade: blueprint.marks[index] >= 80 ? 'A' : blueprint.marks[index] >= 70 ? 'B' : blueprint.marks[index] >= 60 ? 'C' : 'D',
        remarks: index === 1 && blueprint.student.id === students[2].id ? 'Needs remedial practice' : null,
      })),
    });
  }

  await Promise.all(
    students.flatMap((student) => [
      prisma.portalAccount.create({
        data: {
          organizationId: organization.id,
          studentId: student.id,
          type: 'STUDENT',
          email: student.email ?? `${student.firstName.toLowerCase()}.${student.lastName.toLowerCase()}@portal.green-valley-demo.edu`,
          passwordHash,
          isActive: true,
        },
      }),
      prisma.portalAccount.create({
        data: {
          organizationId: organization.id,
          studentId: student.id,
          type: 'PARENT',
          email: student.guardianEmail ?? `guardian.${student.id}@portal.green-valley-demo.edu`,
          passwordHash,
          isActive: true,
        },
      }),
    ]),
  );

  await prisma.reminderTemplate.createMany({
    data: [
      {
        organizationId: organization.id,
        name: 'Demo fee overdue WhatsApp',
        code: 'fee-overdue-guardian',
        channel: 'WHATSAPP',
        target: 'GUARDIAN',
        body:
          'Assalam o Alaikum {{guardianName}}, {{studentName}} has a pending fee at {{organizationName}}. Total fee: {{totalFee}}, paid: {{paidFee}}, pending: {{pendingFee}}, cycle: {{billingCycle}}.',
        isActive: true,
      },
      {
        organizationId: organization.id,
        name: 'Demo payment receipt email',
        code: 'payment-received-email',
        channel: 'EMAIL',
        target: 'STUDENT',
        subject: 'Payment received for {{studentName}}',
        body:
          'Dear {{guardianName}}, {{organizationName}} confirms payment for {{studentName}}. Paid fee: {{paidFee}}, pending fee: {{pendingFee}}.',
        isActive: true,
      },
    ],
  });
}

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

  const studentRole = await prisma.role.upsert({
    where: { name: 'STUDENT' },
    update: { description: 'Student portal identity role reference' },
    create: { name: 'STUDENT', description: 'Student portal identity role reference' },
  });

  const parentRole = await prisma.role.upsert({
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

  const studentPortalPermissionNames = permissionRecords
    .filter((permission) =>
      [
        'portal-dashboard.read',
        'portal-profile.read',
        'portal-fees.read',
        'portal-attendance.read',
        'portal-results.read',
        'portal-timetable.read',
        'portal-reminders.read',
      ].includes(permission.name),
    )
    .map((permission) => permission.name);

  const parentPortalPermissionNames = permissionRecords
    .filter((permission) =>
      [
        'portal-dashboard.read',
        'portal-profile.read',
        'portal-fees.read',
        'portal-attendance.read',
        'portal-results.read',
        'portal-timetable.read',
        'portal-reminders.read',
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

  for (const permission of permissionRecords.filter((item) => studentPortalPermissionNames.includes(item.name))) {
    await prisma.rolePermission.create({
      data: {
        roleId: studentRole.id,
        permissionId: permission.id,
      },
    });
  }

  for (const permission of permissionRecords.filter((item) => parentPortalPermissionNames.includes(item.name))) {
    await prisma.rolePermission.create({
      data: {
        roleId: parentRole.id,
        permissionId: permission.id,
      },
    });
  }

  const passwordHash = await bcrypt.hash(sharedPassword, 12);

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

  await ensureUserRole(superAdmin.id, superAdminRole.id);
  await ensureUserRole(defaultAdmin.id, adminRole.id);

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

  await seedDemoOrganization({
    adminRoleId: adminRole.id,
    staffRoleId: staffRole.id,
    academicCoordinatorRoleId: academicCoordinatorRole.id,
    teacherRoleId: teacherRole.id,
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
