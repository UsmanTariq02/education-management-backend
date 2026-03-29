import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DEFAULT_ORGANIZATION_MODULES } from '../src/common/enums/organization-module.enum';

const prisma = new PrismaClient();
const seededModules = DEFAULT_ORGANIZATION_MODULES as unknown as Parameters<typeof prisma.organization.upsert>[0]['create']['enabledModules'];
const seededModuleCount = DEFAULT_ORGANIZATION_MODULES.length;
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
  'assessments.create',
  'assessments.read',
  'assessments.update',
  'assessments.delete',
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
  await prisma.assessmentResult.deleteMany({ where: { organizationId } });
  await prisma.assessmentAnswer.deleteMany({ where: { organizationId } });
  await prisma.assessmentAttempt.deleteMany({ where: { organizationId } });
  await prisma.assessmentQuestionOption.deleteMany({ where: { question: { organizationId } } });
  await prisma.assessmentQuestion.deleteMany({ where: { organizationId } });
  await prisma.assessment.deleteMany({ where: { organizationId } });
  await prisma.exam.deleteMany({ where: { organizationId } });
  await prisma.timetableEntry.deleteMany({ where: { organizationId } });
  await prisma.batchSubjectAssignment.deleteMany({ where: { organizationId } });
  await prisma.portalAccount.deleteMany({ where: { organizationId } });
  await prisma.studentBatch.deleteMany({ where: { batch: { organizationId } } });
  await prisma.studentDocument.deleteMany({ where: { organizationId } });
  await prisma.organizationAsset.deleteMany({ where: { organizationId } });
  await prisma.organizationBillingEntry.deleteMany({ where: { organizationId } });
  await prisma.onlineClassAutomationRun.deleteMany({ where: { organizationId } });
  await prisma.student.deleteMany({ where: { organizationId } });
  await prisma.teacher.deleteMany({ where: { organizationId } });
  await prisma.subject.deleteMany({ where: { organizationId } });
  await prisma.academicSession.deleteMany({ where: { organizationId } });
  await prisma.batch.deleteMany({ where: { organizationId } });
  await prisma.reminderRule.deleteMany({ where: { organizationId } });
  await prisma.reminderTemplate.deleteMany({ where: { organizationId } });
  await prisma.reminderProviderSetting.deleteMany({ where: { organizationId } });
  await prisma.onlineClassProviderSetting.deleteMany({ where: { organizationId } });
  await prisma.user.deleteMany({ where: { organizationId } });
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

function computeLetterGrade(percentage: number): string {
  if (percentage >= 85) return 'A';
  if (percentage >= 75) return 'B+';
  if (percentage >= 65) return 'B';
  if (percentage >= 55) return 'C+';
  if (percentage >= 45) return 'C';
  return 'D';
}

function roundToTwo(value: number): number {
  return Number(value.toFixed(2));
}

function buildNorthfieldStudentBlueprints(): Array<{
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  address: string;
  dateOfBirth: Date;
}> {
  const firstNames = [
    'Ayaan',
    'Fatima',
    'Zain',
    'Mariam',
    'Huzaifa',
    'Laiba',
    'Ibrahim',
    'Hoorain',
    'Rayyan',
    'Anaya',
    'Talha',
    'Inaya',
    'Abdullah',
    'Mehwish',
    'Hamdan',
    'Aleena',
    'Saad',
    'Rida',
  ];
  const lastNames = ['Khan', 'Malik', 'Sheikh', 'Qureshi', 'Siddiqui', 'Javed'];
  const neighborhoods = ['Gulshan', 'PECHS', 'North Nazimabad', 'Bahadurabad', 'DHA', 'Federal B Area'];

  return Array.from({ length: 54 }, (_, index) => {
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[Math.floor(index / firstNames.length)];
    const fullName = `${firstName} ${lastName}`;
    const studentSequence = String(index + 1).padStart(3, '0');
    const birthMonth = (index % 9) + 1;
    const birthDay = ((index * 3) % 27) + 1;
    const guardianPrefix = index % 2 === 0 ? 'Mr.' : 'Mrs.';

    return {
      firstName,
      lastName,
      fullName,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${studentSequence}@student.northfield-learning.edu`,
      phone: `0315${String(700000 + index).padStart(6, '0')}`,
      guardianName: `${guardianPrefix} ${lastName} Family ${studentSequence}`,
      guardianEmail: `guardian.${studentSequence}@northfield-learning.edu`,
      guardianPhone: `0321${String(500000 + index).padStart(6, '0')}`,
      address: `${neighborhoods[index % neighborhoods.length]}, Karachi`,
      dateOfBirth: new Date(`2010-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}T00:00:00.000Z`),
    };
  });
}

async function seedNorthfieldLearningHub(params: {
  adminRoleId: string;
  staffRoleId: string;
  academicCoordinatorRoleId: string;
  teacherRoleId: string;
}): Promise<void> {
  const organization = await prisma.organization.upsert({
    where: { slug: 'northfield-learning-hub' },
    update: {
      name: 'Northfield Learning Hub',
      email: 'info@northfield-learning.edu',
      phone: '02134567890',
      address: 'Block 6, Shahrah-e-Faisal, Karachi',
      isActive: true,
      subscriptionStatus: 'ACTIVE',
      subscriptionStartsAt: new Date('2025-04-01T00:00:00.000Z'),
      subscriptionEndsAt: new Date('2026-03-31T00:00:00.000Z'),
      subscriptionNotes: 'Seeded premium tenant for QA and server testing.',
      userLimit: 120,
      studentLimit: 1500,
      enabledModules: seededModules,
    },
    create: {
      name: 'Northfield Learning Hub',
      slug: 'northfield-learning-hub',
      email: 'info@northfield-learning.edu',
      phone: '02134567890',
      address: 'Block 6, Shahrah-e-Faisal, Karachi',
      isActive: true,
      subscriptionStatus: 'ACTIVE',
      trialDays: 0,
      trialStartsAt: new Date('2025-04-01T00:00:00.000Z'),
      trialEndsAt: new Date('2025-04-01T00:00:00.000Z'),
      subscriptionStartsAt: new Date('2025-04-01T00:00:00.000Z'),
      subscriptionEndsAt: new Date('2026-03-31T00:00:00.000Z'),
      subscriptionNotes: 'Seeded premium tenant for QA and server testing.',
      userLimit: 120,
      studentLimit: 1500,
      enabledModules: seededModules,
    },
  });

  await resetDemoOrganizationData(organization.id);

  const passwordHash = await bcrypt.hash(sharedPassword, 12);
  const userBlueprints = [
    { firstName: 'Nadia', lastName: 'Farooq', email: 'admin@northfield-learning.edu', roleId: params.adminRoleId },
    { firstName: 'Omar', lastName: 'Waheed', email: 'academics@northfield-learning.edu', roleId: params.academicCoordinatorRoleId },
    { firstName: 'Sana', lastName: 'Yousaf', email: 'finance@northfield-learning.edu', roleId: params.staffRoleId },
    { firstName: 'Kamran', lastName: 'Ali', email: 'frontdesk@northfield-learning.edu', roleId: params.staffRoleId },
    { firstName: 'Amna', lastName: 'Siddiqui', email: 'teacher.amna@northfield-learning.edu', roleId: params.teacherRoleId },
    { firstName: 'Hassan', lastName: 'Rafiq', email: 'teacher.hassan@northfield-learning.edu', roleId: params.teacherRoleId },
    { firstName: 'Rabia', lastName: 'Naz', email: 'teacher.rabia@northfield-learning.edu', roleId: params.teacherRoleId },
    { firstName: 'Usama', lastName: 'Naseem', email: 'teacher.usama@northfield-learning.edu', roleId: params.teacherRoleId },
    { firstName: 'Maryam', lastName: 'Aftab', email: 'teacher.maryam@northfield-learning.edu', roleId: params.teacherRoleId },
    { firstName: 'Farhan', lastName: 'Iqbal', email: 'teacher.farhan@northfield-learning.edu', roleId: params.teacherRoleId },
  ];

  const users = await Promise.all(
    userBlueprints.map((user) =>
      prisma.user.create({
        data: {
          organizationId: organization.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          passwordHash,
          isActive: true,
        },
      }),
    ),
  );

  for (let index = 0; index < users.length; index += 1) {
    await ensureUserRole(users[index].id, userBlueprints[index].roleId);
  }

  const usersByEmail = Object.fromEntries(users.map((user) => [user.email, user]));

  await prisma.organizationBillingEntry.createMany({
    data: [
      {
        organizationId: organization.id,
        type: 'SUBSCRIPTION',
        status: 'PAID',
        title: 'Annual subscription 2025-26',
        description: 'Premium academic operations package.',
        amount: 2400,
        currency: 'USD',
        dueDate: new Date('2025-04-05T00:00:00.000Z'),
        entryDate: new Date('2025-04-01T00:00:00.000Z'),
        periodStart: new Date('2025-04-01T00:00:00.000Z'),
        periodEnd: new Date('2026-03-31T00:00:00.000Z'),
        userCountSnapshot: 10,
        moduleCountSnapshot: seededModuleCount,
      },
      {
        organizationId: organization.id,
        type: 'MANUAL_INVOICE',
        status: 'OPEN',
        title: 'Additional onboarding support',
        description: 'Seeded invoice for billing screens and QA.',
        amount: 180,
        currency: 'USD',
        dueDate: new Date('2026-04-10T00:00:00.000Z'),
        entryDate: new Date('2026-03-20T00:00:00.000Z'),
        userCountSnapshot: 10,
        moduleCountSnapshot: seededModuleCount,
      },
    ],
  });

  await prisma.reminderProviderSetting.create({
    data: {
      organizationId: organization.id,
      autoRemindersEnabled: true,
      emailEnabled: true,
      whatsappEnabled: true,
      smsEnabled: false,
      paymentConfirmationEnabled: true,
      senderName: 'Northfield Learning Hub',
      replyToEmail: 'accounts@northfield-learning.edu',
    },
  });

  await prisma.onlineClassProviderSetting.create({
    data: {
      organizationId: organization.id,
      provider: 'GOOGLE_MEET',
      integrationEnabled: false,
      autoCreateMeetLinks: true,
      autoSyncParticipants: true,
      calendarId: 'northfield-learning-hub@group.calendar.google.com',
      impersonatedUserEmail: 'academics@northfield-learning.edu',
    },
  });

  const [previousSession, currentSession] = await Promise.all([
    prisma.academicSession.create({
      data: {
        organizationId: organization.id,
        name: 'Session 2024-25',
        code: 'SESSION-2024-25-NLH',
        description: 'Archived academic session kept for continuity in reports.',
        startDate: new Date('2024-04-01T00:00:00.000Z'),
        endDate: new Date('2025-03-31T00:00:00.000Z'),
        isCurrent: false,
        isActive: false,
      },
    }),
    prisma.academicSession.create({
      data: {
        organizationId: organization.id,
        name: 'Session 2025-26',
        code: 'SESSION-2025-26-NLH',
        description: 'Current active academic session used across seeded records.',
        startDate: new Date('2025-04-01T00:00:00.000Z'),
        endDate: new Date('2026-03-31T00:00:00.000Z'),
        isCurrent: true,
        isActive: true,
      },
    }),
  ]);

  const batches = await Promise.all([
    prisma.batch.create({
      data: {
        organizationId: organization.id,
        name: 'Grade 9 - Alpha',
        code: 'G9-ALPHA',
        description: 'Science section with blended learning support.',
        startDate: new Date('2025-04-03T00:00:00.000Z'),
        endDate: new Date('2026-03-31T00:00:00.000Z'),
        scheduleInfo: 'Monday to Friday · 08:00 AM to 01:30 PM',
        isActive: true,
      },
    }),
    prisma.batch.create({
      data: {
        organizationId: organization.id,
        name: 'Grade 9 - Beta',
        code: 'G9-BETA',
        description: 'Academic support section with extra supervised practice.',
        startDate: new Date('2025-04-03T00:00:00.000Z'),
        endDate: new Date('2026-03-31T00:00:00.000Z'),
        scheduleInfo: 'Monday to Friday · 08:15 AM to 01:45 PM',
        isActive: true,
      },
    }),
    prisma.batch.create({
      data: {
        organizationId: organization.id,
        name: 'Grade 10 - Alpha',
        code: 'G10-ALPHA',
        description: 'Board-focused section with extended assessment prep.',
        startDate: new Date('2025-04-03T00:00:00.000Z'),
        endDate: new Date('2026-03-31T00:00:00.000Z'),
        scheduleInfo: 'Monday to Saturday · 07:45 AM to 01:45 PM',
        isActive: true,
      },
    }),
  ]);

  const subjectBlueprints = [
    { name: 'English', code: 'ENG-NLH', description: 'Reading, grammar, and writing', teacherEmail: 'teacher.amna@northfield-learning.edu', weeklyClasses: 4 },
    { name: 'Mathematics', code: 'MTH-NLH', description: 'Algebra, geometry, and problem solving', teacherEmail: 'teacher.hassan@northfield-learning.edu', weeklyClasses: 5 },
    { name: 'Physics', code: 'PHY-NLH', description: 'Motion, energy, and practical concepts', teacherEmail: 'teacher.usama@northfield-learning.edu', weeklyClasses: 4 },
    { name: 'Chemistry', code: 'CHE-NLH', description: 'Matter, reactions, and equations', teacherEmail: 'teacher.rabia@northfield-learning.edu', weeklyClasses: 4 },
    { name: 'Biology', code: 'BIO-NLH', description: 'Life sciences and human systems', teacherEmail: 'teacher.rabia@northfield-learning.edu', weeklyClasses: 3 },
    { name: 'Computer Science', code: 'CSC-NLH', description: 'Digital literacy and coding logic', teacherEmail: 'teacher.farhan@northfield-learning.edu', weeklyClasses: 3 },
    { name: 'Pakistan Studies', code: 'PST-NLH', description: 'History, civics, and geography', teacherEmail: 'teacher.maryam@northfield-learning.edu', weeklyClasses: 2 },
  ];

  const subjects = await Promise.all(
    subjectBlueprints.map((subject) =>
      prisma.subject.create({
        data: {
          organizationId: organization.id,
          name: subject.name,
          code: subject.code,
          description: subject.description,
          isActive: true,
        },
      }),
    ),
  );
  const subjectByName = Object.fromEntries(subjects.map((subject) => [subject.name, subject]));

  const teacherBlueprints = [
    {
      employeeId: 'NLH-T-1001',
      firstName: 'Amna',
      lastName: 'Siddiqui',
      email: 'teacher.amna@northfield-learning.edu',
      phone: '03331234001',
      qualification: 'MPhil English Literature',
      specialization: 'English',
      joinedAt: new Date('2024-08-01T00:00:00.000Z'),
    },
    {
      employeeId: 'NLH-T-1002',
      firstName: 'Hassan',
      lastName: 'Rafiq',
      email: 'teacher.hassan@northfield-learning.edu',
      phone: '03331234002',
      qualification: 'MSc Mathematics',
      specialization: 'Mathematics',
      joinedAt: new Date('2024-08-01T00:00:00.000Z'),
    },
    {
      employeeId: 'NLH-T-1003',
      firstName: 'Rabia',
      lastName: 'Naz',
      email: 'teacher.rabia@northfield-learning.edu',
      phone: '03331234003',
      qualification: 'MSc Chemistry',
      specialization: 'Chemistry and Biology',
      joinedAt: new Date('2024-08-01T00:00:00.000Z'),
    },
    {
      employeeId: 'NLH-T-1004',
      firstName: 'Usama',
      lastName: 'Naseem',
      email: 'teacher.usama@northfield-learning.edu',
      phone: '03331234004',
      qualification: 'MS Physics',
      specialization: 'Physics',
      joinedAt: new Date('2024-08-01T00:00:00.000Z'),
    },
    {
      employeeId: 'NLH-T-1005',
      firstName: 'Maryam',
      lastName: 'Aftab',
      email: 'teacher.maryam@northfield-learning.edu',
      phone: '03331234005',
      qualification: 'MA Pakistan Studies',
      specialization: 'Social Studies',
      joinedAt: new Date('2024-08-01T00:00:00.000Z'),
    },
    {
      employeeId: 'NLH-T-1006',
      firstName: 'Farhan',
      lastName: 'Iqbal',
      email: 'teacher.farhan@northfield-learning.edu',
      phone: '03331234006',
      qualification: 'BS Computer Science',
      specialization: 'Computer Science',
      joinedAt: new Date('2024-08-01T00:00:00.000Z'),
    },
  ];

  const teachers = await Promise.all(
    teacherBlueprints.map((teacher) =>
      prisma.teacher.create({
        data: {
          organizationId: organization.id,
          employeeId: teacher.employeeId,
          firstName: teacher.firstName,
          lastName: teacher.lastName,
          fullName: `${teacher.firstName} ${teacher.lastName}`,
          email: teacher.email,
          phone: teacher.phone,
          qualification: teacher.qualification,
          specialization: teacher.specialization,
          joinedAt: teacher.joinedAt,
          isActive: true,
        },
      }),
    ),
  );
  const teachersByEmail = Object.fromEntries(teachers.map((teacher) => [teacher.email ?? '', teacher]));

  await prisma.batchSubjectAssignment.createMany({
    data: batches.flatMap((batch) =>
      subjectBlueprints.map((subject) => ({
        organizationId: organization.id,
        academicSessionId: currentSession.id,
        batchId: batch.id,
        subjectId: subjectByName[subject.name].id,
        teacherId: teachersByEmail[subject.teacherEmail].id,
        weeklyClasses: subject.weeklyClasses,
        isPrimary: ['English', 'Mathematics', 'Physics', 'Chemistry'].includes(subject.name),
        isActive: true,
      })),
    ),
  });

  const timetableBlueprints = [
    { batchIndex: 0, subjectName: 'English', dayOfWeek: 'MONDAY', startTime: '08:00', endTime: '08:45', deliveryMode: 'OFFLINE', room: 'Room 9-A' },
    { batchIndex: 0, subjectName: 'Mathematics', dayOfWeek: 'TUESDAY', startTime: '09:00', endTime: '09:45', deliveryMode: 'ONLINE', room: null },
    { batchIndex: 0, subjectName: 'Physics', dayOfWeek: 'WEDNESDAY', startTime: '10:00', endTime: '10:45', deliveryMode: 'OFFLINE', room: 'Physics Lab' },
    { batchIndex: 0, subjectName: 'Chemistry', dayOfWeek: 'THURSDAY', startTime: '11:00', endTime: '11:45', deliveryMode: 'OFFLINE', room: 'Chemistry Lab' },
    { batchIndex: 0, subjectName: 'Computer Science', dayOfWeek: 'FRIDAY', startTime: '12:00', endTime: '12:45', deliveryMode: 'ONLINE', room: null },
    { batchIndex: 1, subjectName: 'English', dayOfWeek: 'MONDAY', startTime: '08:15', endTime: '09:00', deliveryMode: 'OFFLINE', room: 'Room 9-B' },
    { batchIndex: 1, subjectName: 'Mathematics', dayOfWeek: 'TUESDAY', startTime: '09:15', endTime: '10:00', deliveryMode: 'ONLINE', room: null },
    { batchIndex: 1, subjectName: 'Biology', dayOfWeek: 'WEDNESDAY', startTime: '10:15', endTime: '11:00', deliveryMode: 'OFFLINE', room: 'Biology Lab' },
    { batchIndex: 1, subjectName: 'Pakistan Studies', dayOfWeek: 'THURSDAY', startTime: '11:15', endTime: '12:00', deliveryMode: 'OFFLINE', room: 'Room 9-B' },
    { batchIndex: 1, subjectName: 'Computer Science', dayOfWeek: 'FRIDAY', startTime: '12:15', endTime: '01:00', deliveryMode: 'ONLINE', room: null },
    { batchIndex: 2, subjectName: 'English', dayOfWeek: 'MONDAY', startTime: '07:45', endTime: '08:30', deliveryMode: 'OFFLINE', room: 'Room 10-A' },
    { batchIndex: 2, subjectName: 'Mathematics', dayOfWeek: 'TUESDAY', startTime: '08:40', endTime: '09:25', deliveryMode: 'ONLINE', room: null },
    { batchIndex: 2, subjectName: 'Physics', dayOfWeek: 'WEDNESDAY', startTime: '09:35', endTime: '10:20', deliveryMode: 'OFFLINE', room: 'Senior Physics Lab' },
    { batchIndex: 2, subjectName: 'Chemistry', dayOfWeek: 'THURSDAY', startTime: '10:30', endTime: '11:15', deliveryMode: 'OFFLINE', room: 'Senior Chemistry Lab' },
    { batchIndex: 2, subjectName: 'Computer Science', dayOfWeek: 'SATURDAY', startTime: '11:25', endTime: '12:10', deliveryMode: 'ONLINE', room: null },
  ] as const;

  const timetableEntries = [];
  for (const entry of timetableBlueprints) {
    const subject = subjectByName[entry.subjectName];
    const teacher = teachersByEmail[subjectBlueprints.find((item) => item.name === entry.subjectName)?.teacherEmail ?? ''];
    const created = await prisma.timetableEntry.create({
      data: {
        organizationId: organization.id,
        academicSessionId: currentSession.id,
        batchId: batches[entry.batchIndex].id,
        subjectId: subject.id,
        teacherId: teacher?.id ?? null,
        dayOfWeek: entry.dayOfWeek,
        startTime: entry.startTime,
        endTime: entry.endTime,
        deliveryMode: entry.deliveryMode,
        onlineClassProvider: entry.deliveryMode === 'ONLINE' ? 'GOOGLE_MEET' : null,
        onlineMeetingUrl:
          entry.deliveryMode === 'ONLINE'
            ? `https://meet.google.com/nlh-${batches[entry.batchIndex].code.toLowerCase()}-${subject.code.toLowerCase()}`
            : null,
        onlineMeetingCode: entry.deliveryMode === 'ONLINE' ? `NLH-${subject.code}-${batches[entry.batchIndex].code}` : null,
        autoAttendanceEnabled: entry.deliveryMode === 'ONLINE',
        attendanceJoinThresholdMinutes: entry.deliveryMode === 'ONLINE' ? 7 : 5,
        room: entry.room,
        notes: entry.deliveryMode === 'ONLINE' ? 'Seeded online session slot for QA.' : null,
        isActive: true,
      },
    });
    timetableEntries.push(created);
  }

  const studentBlueprints = buildNorthfieldStudentBlueprints();
  const students: Array<{
    id: string;
    firstName: string;
    fullName: string;
    email: string | null;
    guardianName: string;
    guardianEmail: string | null;
  }> = [];
  const studentBatchLinks: Array<{ studentId: string; batchId: string }> = [];
  for (let index = 0; index < studentBlueprints.length; index += 1) {
    const batch = batches[index % batches.length];
    const student = await prisma.student.create({
      data: {
        organizationId: organization.id,
        ...studentBlueprints[index],
        admissionDate: new Date(`2025-04-${String((index % 18) + 2).padStart(2, '0')}T00:00:00.000Z`),
        status: 'ACTIVE',
      },
    });
    students.push(student);
    studentBatchLinks.push({ studentId: student.id, batchId: batch.id });
  }

  await prisma.studentBatch.createMany({
    data: studentBatchLinks.map((item) => ({
      studentId: item.studentId,
      batchId: item.batchId,
      joinedAt: new Date('2025-04-10T00:00:00.000Z'),
      status: 'ACTIVE',
    })),
  });

  const studentsByBatch = batches.map((batch) => students.filter((_, index) => studentBatchLinks[index].batchId === batch.id));

  await prisma.portalAccount.createMany({
    data: students.flatMap((student) => [
      {
        organizationId: organization.id,
        studentId: student.id,
        type: 'STUDENT',
        email: student.email ?? `student.${student.id}@northfield-learning.edu`,
        passwordHash,
        isActive: true,
      },
      {
        organizationId: organization.id,
        studentId: student.id,
        type: 'PARENT',
        email: student.guardianEmail ?? `guardian.${student.id}@northfield-learning.edu`,
        passwordHash,
        isActive: true,
      },
    ]),
  });

  const feePlanByStudentId = new Map<string, { id: string; monthlyFee: number; batchId: string }>();
  for (let index = 0; index < students.length; index += 1) {
    const batchId = studentBatchLinks[index].batchId;
    const monthlyFee = batchId === batches[2].id ? 14250 : 12800;
    const feePlan = await prisma.feePlan.create({
      data: {
        organizationId: organization.id,
        studentId: students[index].id,
        batchId,
        monthlyFee,
        dueDay: 10,
        isActive: true,
      },
    });
    feePlanByStudentId.set(students[index].id, { id: feePlan.id, monthlyFee, batchId });
  }

  const overdueMarchFeeRecords: Array<{ id: string; studentId: string; amountDue: number; amountPaid: number }> = [];
  const feeMonths = [
    { month: 1, year: 2026 },
    { month: 2, year: 2026 },
    { month: 3, year: 2026 },
  ];

  for (let index = 0; index < students.length; index += 1) {
    const student = students[index];
    const feePlan = feePlanByStudentId.get(student.id);
    if (!feePlan) {
      continue;
    }

    for (const cycle of feeMonths) {
      const bucket = (index + cycle.month) % 6;
      const amountDue = feePlan.monthlyFee;
      const amountPaid = bucket === 0 ? 0 : bucket === 1 ? roundToTwo(amountDue * 0.55) : amountDue;
      const status = bucket === 0 ? 'OVERDUE' : bucket === 1 ? 'PARTIAL' : 'PAID';
      const record = await prisma.feeRecord.create({
        data: {
          organizationId: organization.id,
          studentId: student.id,
          batchId: feePlan.batchId,
          feePlanId: feePlan.id,
          month: cycle.month,
          year: cycle.year,
          amountDue,
          amountPaid,
          status,
          paidAt: status === 'PAID' || status === 'PARTIAL' ? new Date(`2026-${String(cycle.month).padStart(2, '0')}-09T09:00:00.000Z`) : null,
          paymentMethod: status === 'OVERDUE' ? null : bucket % 2 === 0 ? 'BANK_TRANSFER' : 'ONLINE',
          remarks: status === 'OVERDUE' ? 'Escalated for reminder automation testing' : status === 'PARTIAL' ? 'Partially collected by finance office' : 'Paid on time',
        },
      });

      if (cycle.month === 3 && status === 'OVERDUE') {
        overdueMarchFeeRecords.push({ id: record.id, studentId: student.id, amountDue, amountPaid });
      }
    }
  }

  const attendanceDates = [
    new Date('2026-03-16T00:00:00.000Z'),
    new Date('2026-03-17T00:00:00.000Z'),
    new Date('2026-03-18T00:00:00.000Z'),
    new Date('2026-03-19T00:00:00.000Z'),
    new Date('2026-03-20T00:00:00.000Z'),
  ];

  await prisma.attendance.createMany({
    data: students.flatMap((student, index) =>
      attendanceDates.map((attendanceDate, dateIndex) => {
        const batchId = studentBatchLinks[index].batchId;
        const selector = (index + dateIndex * 2) % 11;
        const status = selector === 0 ? 'ABSENT' : selector === 1 ? 'LATE' : selector === 2 ? 'LEAVE' : 'PRESENT';
        return {
          organizationId: organization.id,
          studentId: student.id,
          batchId,
          attendanceDate,
          status,
          source: 'MANUAL',
          remarks: status === 'ABSENT' ? 'Guardian informed via front desk' : status === 'LEAVE' ? 'Approved leave entry' : null,
        };
      }),
    ),
  });

  await prisma.studentDocument.createMany({
    data: students.slice(0, 12).flatMap((student, index) => [
      {
        organizationId: organization.id,
        studentId: student.id,
        uploadedByUserId: usersByEmail['frontdesk@northfield-learning.edu'].id,
        title: 'Admission Form',
        type: 'ADMISSION_FORM',
        notes: 'Seeded scanned admission packet.',
        originalName: `admission-form-${index + 1}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 256000 + index * 1000,
        storagePath: `seed/northfield/students/${student.id}/admission-form.pdf`,
      },
      {
        organizationId: organization.id,
        studentId: student.id,
        uploadedByUserId: usersByEmail['frontdesk@northfield-learning.edu'].id,
        title: 'Birth Certificate',
        type: 'BIRTH_CERTIFICATE',
        notes: 'Seeded verification document.',
        originalName: `birth-certificate-${index + 1}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 198000 + index * 850,
        storagePath: `seed/northfield/students/${student.id}/birth-certificate.pdf`,
      },
    ]),
  });

  await prisma.organizationAsset.createMany({
    data: [
      {
        organizationId: organization.id,
        uploadedByUserId: usersByEmail['admin@northfield-learning.edu'].id,
        title: 'Primary School Logo',
        type: 'LOGO',
        notes: 'Seeded branding asset.',
        originalName: 'northfield-logo.png',
        mimeType: 'image/png',
        sizeBytes: 86432,
        storagePath: 'seed/northfield/assets/logo.png',
      },
      {
        organizationId: organization.id,
        uploadedByUserId: usersByEmail['admin@northfield-learning.edu'].id,
        title: 'Official Letterhead',
        type: 'LETTERHEAD',
        notes: 'Seeded stationery asset.',
        originalName: 'northfield-letterhead.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 145220,
        storagePath: 'seed/northfield/assets/letterhead.pdf',
      },
    ],
  });

  const reminderTemplates = await Promise.all([
    prisma.reminderTemplate.create({
      data: {
        organizationId: organization.id,
        name: 'Northfield fee overdue WhatsApp',
        code: 'fee-overdue-guardian',
        channel: 'WHATSAPP',
        target: 'GUARDIAN',
        body:
          'Assalam o Alaikum {{guardianName}}, {{studentName}} has an overdue fee at {{organizationName}}. Total fee: {{totalFee}}, paid: {{paidFee}}, pending: {{pendingFee}}, due date: {{dueDate}}.',
        isActive: true,
      },
    }),
    prisma.reminderTemplate.create({
      data: {
        organizationId: organization.id,
        name: 'Northfield payment receipt email',
        code: 'payment-received-email',
        channel: 'EMAIL',
        target: 'STUDENT',
        subject: 'Payment received for {{studentName}}',
        body:
          'Dear {{guardianName}}, {{organizationName}} confirms fee receipt for {{studentName}}. Paid fee: {{paidFee}}, pending fee: {{pendingFee}}.',
        isActive: true,
      },
    }),
  ]);

  const reminderRules = await Promise.all([
    prisma.reminderRule.create({
      data: {
        organizationId: organization.id,
        templateId: reminderTemplates[0].id,
        name: 'Overdue WhatsApp after 2 days',
        trigger: 'FEE_OVERDUE',
        offsetDays: 2,
        isActive: true,
      },
    }),
    prisma.reminderRule.create({
      data: {
        organizationId: organization.id,
        templateId: reminderTemplates[1].id,
        name: 'Payment confirmation email same day',
        trigger: 'PAYMENT_RECEIVED',
        offsetDays: 0,
        isActive: true,
      },
    }),
  ]);

  for (const overdueRecord of overdueMarchFeeRecords.slice(0, 9)) {
    const student = students.find((item) => item.id === overdueRecord.studentId);
    if (!student) {
      continue;
    }

    const reminderLog = await prisma.reminderLog.create({
      data: {
        organizationId: organization.id,
        studentId: student.id,
        feeRecordId: overdueRecord.id,
        channel: 'WHATSAPP',
        message: `Fee overdue reminder sent to ${student.guardianName} for ${student.fullName}.`,
        sentByUserId: usersByEmail['finance@northfield-learning.edu'].id,
        sentAt: new Date('2026-03-15T10:00:00.000Z'),
        status: 'SENT',
        deliveryReference: `whatsapp-nlh-${student.id.slice(0, 8)}`,
      },
    });

    await prisma.reminderSchedule.create({
      data: {
        organizationId: organization.id,
        ruleId: reminderRules[0].id,
        templateId: reminderTemplates[0].id,
        studentId: student.id,
        feeRecordId: overdueRecord.id,
        reminderLogId: reminderLog.id,
        scheduledFor: new Date('2026-03-15T09:00:00.000Z'),
        processedAt: new Date('2026-03-15T10:00:00.000Z'),
        status: 'SENT',
      },
    });
  }

  const onlineTimetableEntries = timetableEntries.filter((entry) => entry.deliveryMode === 'ONLINE');
  for (const entry of onlineTimetableEntries) {
    const session = await prisma.onlineClassSession.create({
      data: {
        organizationId: organization.id,
        timetableEntryId: entry.id,
        academicSessionId: currentSession.id,
        batchId: entry.batchId,
        subjectId: entry.subjectId,
        teacherId: entry.teacherId,
        provider: entry.onlineClassProvider ?? 'GOOGLE_MEET',
        status: 'COMPLETED',
        scheduledStartAt: new Date(`2026-03-${entry.dayOfWeek === 'SATURDAY' ? '21' : '18'}T${entry.startTime}:00.000Z`),
        scheduledEndAt: new Date(`2026-03-${entry.dayOfWeek === 'SATURDAY' ? '21' : '18'}T${entry.endTime}:00.000Z`),
        actualStartAt: new Date(`2026-03-${entry.dayOfWeek === 'SATURDAY' ? '21' : '18'}T${entry.startTime}:00.000Z`),
        actualEndAt: new Date(`2026-03-${entry.dayOfWeek === 'SATURDAY' ? '21' : '18'}T${entry.endTime}:00.000Z`),
        meetingUrl: entry.onlineMeetingUrl,
        meetingCode: entry.onlineMeetingCode,
        externalCalendarEventId: `evt-${entry.id.slice(0, 8)}`,
        externalSpaceId: `space-${entry.id.slice(0, 8)}`,
        externalConferenceRecordId: `conf-${entry.id.slice(0, 8)}`,
        lastParticipantSyncAt: new Date('2026-03-18T12:30:00.000Z'),
        lastParticipantSyncStatus: 'SUCCESS',
        attendanceProcessedAt: new Date('2026-03-18T12:35:00.000Z'),
      },
    });

    const participants = students
      .filter((student, studentIndex) => studentBatchLinks[studentIndex].batchId === entry.batchId)
      .slice(0, 8);

    await prisma.onlineClassParticipantSession.createMany({
      data: participants.map((student, participantIndex) => ({
        organizationId: organization.id,
        onlineClassSessionId: session.id,
        studentId: student.id,
        participantEmail: student.email,
        participantName: student.fullName,
        externalParticipantId: `participant-${participantIndex + 1}-${session.id.slice(0, 6)}`,
        joinedAt: new Date(`2026-03-${entry.dayOfWeek === 'SATURDAY' ? '21' : '18'}T${entry.startTime}:00.000Z`),
        leftAt: new Date(`2026-03-${entry.dayOfWeek === 'SATURDAY' ? '21' : '18'}T${entry.endTime}:00.000Z`),
        totalMinutes: 42 - (participantIndex % 3),
        attendanceMarked: true,
      })),
    });
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const batchStudents = studentsByBatch[batchIndex];
    const supervisingTeacher = teachersByEmail['teacher.amna@northfield-learning.edu'];

    const exam = await prisma.exam.create({
      data: {
        organizationId: organization.id,
        academicSessionId: currentSession.id,
        batchId: batch.id,
        teacherId: supervisingTeacher.id,
        name: `${batch.name} Mid Term Examination`,
        code: `MIDTERM-${batch.code}`,
        description: 'Seeded published exam for academic reporting and portal result testing.',
        examDate: new Date(`2026-02-${String(10 + batchIndex).padStart(2, '0')}T00:00:00.000Z`),
        isPublished: true,
      },
    });

    const examSubjects = await Promise.all(
      subjects.map((subject) =>
        prisma.examSubject.create({
          data: {
            examId: exam.id,
            subjectId: subject.id,
            totalMarks: 100,
            passMarks: 40,
          },
        }),
      ),
    );

    for (let studentIndex = 0; studentIndex < batchStudents.length; studentIndex += 1) {
      const student = batchStudents[studentIndex];
      const marks = examSubjects.map((_, subjectIndex) => 58 + ((studentIndex * 7 + subjectIndex * 5 + batchIndex * 3) % 35));
      const totalObtained = marks.reduce((sum, value) => sum + value, 0);
      const percentage = roundToTwo(totalObtained / examSubjects.length);
      const result = await prisma.studentExamResult.create({
        data: {
          organizationId: organization.id,
          academicSessionId: currentSession.id,
          examId: exam.id,
          studentId: student.id,
          batchId: batch.id,
          totalObtained,
          percentage,
          grade: computeLetterGrade(percentage),
          remarks: percentage >= 80 ? 'High performing student' : percentage >= 60 ? 'Stable academic progress' : 'Needs intervention in one or more core subjects',
          status: 'PUBLISHED',
          publishedAt: new Date('2026-02-20T09:00:00.000Z'),
        },
      });

      await prisma.studentExamResultItem.createMany({
        data: examSubjects.map((examSubject, subjectIndex) => ({
          organizationId: organization.id,
          resultId: result.id,
          examSubjectId: examSubject.id,
          subjectId: examSubject.subjectId,
          obtainedMarks: marks[subjectIndex],
          grade: computeLetterGrade(marks[subjectIndex]),
          remarks: marks[subjectIndex] < 50 ? 'Follow-up support recommended' : null,
        })),
      });
    }
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
    const batch = batches[batchIndex];
    const batchStudents = studentsByBatch[batchIndex];
    const mathematics = subjectByName['Mathematics'];
    const english = subjectByName['English'];
    const mathTeacher = teachersByEmail['teacher.hassan@northfield-learning.edu'];
    const englishTeacher = teachersByEmail['teacher.amna@northfield-learning.edu'];

    const objectiveAssessment = await prisma.assessment.create({
      data: {
        organizationId: organization.id,
        academicSessionId: currentSession.id,
        batchId: batch.id,
        subjectId: mathematics.id,
        teacherId: mathTeacher.id,
        title: `${batch.name} Mathematics Speed Quiz`,
        code: `QUIZ-${batch.code}-MATH`,
        description: 'Objective quiz for instant result publication.',
        instructions: 'Attempt all questions. Objective items are graded instantly.',
        type: 'QUIZ',
        status: 'PUBLISHED',
        durationMinutes: 25,
        totalMarks: 20,
        passMarks: 10,
        startsAt: new Date('2026-03-22T08:00:00.000Z'),
        endsAt: new Date('2026-03-22T08:30:00.000Z'),
        availableFrom: new Date('2026-03-22T07:45:00.000Z'),
        availableUntil: new Date('2026-03-22T12:00:00.000Z'),
        shuffleQuestions: true,
        shuffleOptions: true,
        showResultImmediately: true,
        allowMultipleAttempts: false,
        maxAttempts: 1,
        negativeMarkingEnabled: false,
        questions: {
          create: [
            {
              organizationId: organization.id,
              subjectId: mathematics.id,
              prompt: 'What is 12 x 8?',
              type: 'MCQ',
              orderIndex: 1,
              marks: 4,
              acceptedAnswers: [],
              options: {
                create: [
                  { text: '84', orderIndex: 1, isCorrect: false },
                  { text: '96', orderIndex: 2, isCorrect: true },
                  { text: '108', orderIndex: 3, isCorrect: false },
                  { text: '88', orderIndex: 4, isCorrect: false },
                ],
              },
            },
            {
              organizationId: organization.id,
              subjectId: mathematics.id,
              prompt: 'A prime number has exactly two factors.',
              type: 'TRUE_FALSE',
              orderIndex: 2,
              marks: 4,
              acceptedAnswers: [],
              correctBooleanAnswer: true,
              options: {
                create: [
                  { text: 'True', orderIndex: 1, isCorrect: true },
                  { text: 'False', orderIndex: 2, isCorrect: false },
                ],
              },
            },
            {
              organizationId: organization.id,
              subjectId: mathematics.id,
              prompt: 'The square root of 81 is ____.',
              type: 'FILL_IN_THE_BLANK',
              orderIndex: 3,
              marks: 4,
              acceptedAnswers: ['9', 'nine'],
            },
            {
              organizationId: organization.id,
              subjectId: mathematics.id,
              prompt: 'Which fraction is equal to 0.25?',
              type: 'MCQ',
              orderIndex: 4,
              marks: 4,
              acceptedAnswers: [],
              options: {
                create: [
                  { text: '1/2', orderIndex: 1, isCorrect: false },
                  { text: '1/3', orderIndex: 2, isCorrect: false },
                  { text: '1/4', orderIndex: 3, isCorrect: true },
                  { text: '3/4', orderIndex: 4, isCorrect: false },
                ],
              },
            },
            {
              organizationId: organization.id,
              subjectId: mathematics.id,
              prompt: 'An obtuse angle is greater than 90 degrees.',
              type: 'TRUE_FALSE',
              orderIndex: 5,
              marks: 4,
              acceptedAnswers: [],
              correctBooleanAnswer: true,
              options: {
                create: [
                  { text: 'True', orderIndex: 1, isCorrect: true },
                  { text: 'False', orderIndex: 2, isCorrect: false },
                ],
              },
            },
          ],
        },
      },
      include: {
        questions: {
          include: { options: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    const mixedAssessment = await prisma.assessment.create({
      data: {
        organizationId: organization.id,
        academicSessionId: currentSession.id,
        batchId: batch.id,
        subjectId: english.id,
        teacherId: englishTeacher.id,
        title: `${batch.name} English Writing Assignment`,
        code: `ASSIGN-${batch.code}-ENG`,
        description: 'Mixed-format assignment with manual review components.',
        instructions: 'Answer all questions. Some parts are reviewed manually by the teacher.',
        type: 'ASSIGNMENT',
        status: 'PUBLISHED',
        durationMinutes: 45,
        totalMarks: 25,
        passMarks: 13,
        startsAt: new Date('2026-03-24T09:00:00.000Z'),
        endsAt: new Date('2026-03-24T10:00:00.000Z'),
        availableFrom: new Date('2026-03-24T08:30:00.000Z'),
        availableUntil: new Date('2026-03-24T15:00:00.000Z'),
        shuffleQuestions: false,
        shuffleOptions: false,
        showResultImmediately: true,
        allowMultipleAttempts: false,
        maxAttempts: 1,
        negativeMarkingEnabled: false,
        questions: {
          create: [
            {
              organizationId: organization.id,
              subjectId: english.id,
              prompt: 'Choose the correctly punctuated sentence.',
              type: 'MCQ',
              orderIndex: 1,
              marks: 4,
              acceptedAnswers: [],
              options: {
                create: [
                  { text: 'Lets read, quietly.', orderIndex: 1, isCorrect: false },
                  { text: 'Let’s read quietly.', orderIndex: 2, isCorrect: true },
                  { text: 'Lets, read quietly.', orderIndex: 3, isCorrect: false },
                  { text: 'Lets read quietly', orderIndex: 4, isCorrect: false },
                ],
              },
            },
            {
              organizationId: organization.id,
              subjectId: english.id,
              prompt: 'Write a one-sentence summary of why reading daily improves writing.',
              type: 'SHORT_ANSWER',
              orderIndex: 2,
              marks: 6,
              acceptedAnswers: [],
            },
            {
              organizationId: organization.id,
              subjectId: english.id,
              prompt: 'Write a short paragraph describing a responsible student.',
              type: 'LONG_ANSWER',
              orderIndex: 3,
              marks: 10,
              acceptedAnswers: [],
            },
            {
              organizationId: organization.id,
              subjectId: english.id,
              prompt: 'Fill in the blank: A group of words that expresses a complete idea is called a ____.',
              type: 'FILL_IN_THE_BLANK',
              orderIndex: 4,
              marks: 5,
              acceptedAnswers: ['sentence'],
            },
          ],
        },
      },
      include: {
        questions: {
          include: { options: true },
          orderBy: { orderIndex: 'asc' },
        },
      },
    });

    for (let studentIndex = 0; studentIndex < batchStudents.length; studentIndex += 1) {
      const student = batchStudents[studentIndex];

      const objectiveAttempt = await prisma.assessmentAttempt.create({
        data: {
          organizationId: organization.id,
          assessmentId: objectiveAssessment.id,
          studentId: student.id,
          status: 'COMPLETED',
          attemptNumber: 1,
          startedAt: new Date('2026-03-22T08:02:00.000Z'),
          submittedAt: new Date('2026-03-22T08:18:00.000Z'),
          autoGradedAt: new Date('2026-03-22T08:18:05.000Z'),
          requiresManualReview: false,
        },
      });

      let objectiveMarks = 0;
      let objectiveCorrect = 0;
      let objectiveIncorrect = 0;

      for (const question of objectiveAssessment.questions) {
        if (question.type === 'MCQ' || question.type === 'TRUE_FALSE') {
          const correctOption = question.options.find((option) => option.isCorrect);
          const selectedOption =
            studentIndex % 5 === 0
              ? question.options.find((option) => !option.isCorrect) ?? correctOption
              : correctOption;
          const isCorrect = selectedOption?.isCorrect ?? false;
          if (isCorrect) {
            objectiveCorrect += 1;
            objectiveMarks += Number(question.marks);
          } else {
            objectiveIncorrect += 1;
          }

          await prisma.assessmentAnswer.create({
            data: {
              organizationId: organization.id,
              attemptId: objectiveAttempt.id,
              questionId: question.id,
              selectedOptionId: selectedOption?.id ?? null,
              isCorrect,
              awardedMarks: isCorrect ? question.marks : 0,
              isAutoGraded: true,
            },
          });
        } else {
          const answerText = studentIndex % 6 === 0 ? 'eight' : '9';
          const isCorrect = question.acceptedAnswers.includes(answerText.toLowerCase());
          if (isCorrect) {
            objectiveCorrect += 1;
            objectiveMarks += Number(question.marks);
          } else {
            objectiveIncorrect += 1;
          }

          await prisma.assessmentAnswer.create({
            data: {
              organizationId: organization.id,
              attemptId: objectiveAttempt.id,
              questionId: question.id,
              answerText,
              isCorrect,
              awardedMarks: isCorrect ? question.marks : 0,
              isAutoGraded: true,
            },
          });
        }
      }

      await prisma.assessmentResult.create({
        data: {
          organizationId: organization.id,
          assessmentId: objectiveAssessment.id,
          attemptId: objectiveAttempt.id,
          studentId: student.id,
          obtainedMarks: objectiveMarks,
          totalMarks: Number(objectiveAssessment.totalMarks),
          percentage: roundToTwo((objectiveMarks / Number(objectiveAssessment.totalMarks)) * 100),
          correctAnswers: objectiveCorrect,
          incorrectAnswers: objectiveIncorrect,
          unansweredCount: 0,
          status: 'FINALIZED',
          publishedAt: new Date('2026-03-22T08:19:00.000Z'),
        },
      });

      const reviewedSubjective = studentIndex < 8;
      const mixedAttemptStatus = reviewedSubjective ? 'COMPLETED' : 'REVIEW_PENDING';
      const mixedAttempt = await prisma.assessmentAttempt.create({
        data: {
          organizationId: organization.id,
          assessmentId: mixedAssessment.id,
          studentId: student.id,
          status: mixedAttemptStatus,
          attemptNumber: 1,
          startedAt: new Date('2026-03-24T09:05:00.000Z'),
          submittedAt: new Date('2026-03-24T09:42:00.000Z'),
          autoGradedAt: new Date('2026-03-24T09:42:05.000Z'),
          requiresManualReview: true,
        },
      });

      let mixedMarks = 0;
      let mixedCorrect = 0;
      let mixedIncorrect = 0;
      let unansweredCount = 0;

      for (const question of mixedAssessment.questions) {
        if (question.type === 'MCQ') {
          const correctOption = question.options.find((option) => option.isCorrect);
          const selectedOption = studentIndex % 4 === 0 ? question.options[0] : correctOption;
          const isCorrect = selectedOption?.isCorrect ?? false;
          if (isCorrect) {
            mixedCorrect += 1;
            mixedMarks += Number(question.marks);
          } else {
            mixedIncorrect += 1;
          }

          await prisma.assessmentAnswer.create({
            data: {
              organizationId: organization.id,
              attemptId: mixedAttempt.id,
              questionId: question.id,
              selectedOptionId: selectedOption?.id ?? null,
              isCorrect,
              awardedMarks: isCorrect ? question.marks : 0,
              isAutoGraded: true,
            },
          });
          continue;
        }

        if (question.type === 'FILL_IN_THE_BLANK') {
          const answerText = studentIndex % 7 === 0 ? 'phrase' : 'sentence';
          const isCorrect = question.acceptedAnswers.includes(answerText.toLowerCase());
          if (isCorrect) {
            mixedCorrect += 1;
            mixedMarks += Number(question.marks);
          } else {
            mixedIncorrect += 1;
          }

          await prisma.assessmentAnswer.create({
            data: {
              organizationId: organization.id,
              attemptId: mixedAttempt.id,
              questionId: question.id,
              answerText,
              isCorrect,
              awardedMarks: isCorrect ? question.marks : 0,
              isAutoGraded: true,
            },
          });
          continue;
        }

        const answerText =
          question.type === 'SHORT_ANSWER'
            ? `Reading daily expands vocabulary and helps ${student.firstName} write with more clarity.`
            : `${student.firstName} is responsible because ${student.firstName.toLowerCase()} completes work on time, respects classmates, and prepares for lessons consistently.`;

        let awardedMarks: number | null = null;
        let feedback: string | null = null;
        let reviewedAt: Date | null = null;
        let reviewedByTeacherId: string | null = null;

        if (reviewedSubjective) {
          reviewedByTeacherId = englishTeacher.id;
          reviewedAt = new Date('2026-03-24T12:30:00.000Z');
          awardedMarks =
            question.type === 'SHORT_ANSWER'
              ? 4 + ((studentIndex + batchIndex) % 3)
              : 7 + ((studentIndex + batchIndex) % 4);
          feedback =
            question.type === 'SHORT_ANSWER'
              ? 'Good concise response with clear reasoning.'
              : 'Structured answer with room for more detail and examples.';
          mixedMarks += awardedMarks;
        } else {
          unansweredCount += 0;
        }

        await prisma.assessmentAnswer.create({
          data: {
            organizationId: organization.id,
            attemptId: mixedAttempt.id,
            questionId: question.id,
            answerText,
            isCorrect: null,
            awardedMarks,
            isAutoGraded: false,
            reviewedByTeacherId,
            reviewedAt,
            feedback,
          },
        });
      }

      await prisma.assessmentResult.create({
        data: {
          organizationId: organization.id,
          assessmentId: mixedAssessment.id,
          attemptId: mixedAttempt.id,
          studentId: student.id,
          obtainedMarks: mixedMarks,
          totalMarks: Number(mixedAssessment.totalMarks),
          percentage: roundToTwo((mixedMarks / Number(mixedAssessment.totalMarks)) * 100),
          correctAnswers: mixedCorrect,
          incorrectAnswers: mixedIncorrect,
          unansweredCount,
          status: reviewedSubjective ? 'FINALIZED' : 'PROVISIONAL',
          publishedAt: reviewedSubjective ? new Date('2026-03-24T12:35:00.000Z') : new Date('2026-03-24T09:43:00.000Z'),
        },
      });
    }
  }

  void previousSession;
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
        'assessments.create',
        'assessments.read',
        'assessments.update',
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
        'assessments.read',
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

  await seedNorthfieldLearningHub({
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
