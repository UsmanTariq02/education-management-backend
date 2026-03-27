import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import configuration from './config/configuration';
import { CommonModule } from './common/common.module';
import { envValidationSchema } from './config/env.validation';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ModuleAccessGuard } from './common/guards/module-access.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PortalAuthModule } from './modules/portal-auth/portal-auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { StudentsModule } from './modules/students/students.module';
import { BatchesModule } from './modules/batches/batches.module';
import { AcademicSessionsModule } from './modules/academic-sessions/academic-sessions.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { BatchSubjectAssignmentsModule } from './modules/batch-subject-assignments/batch-subject-assignments.module';
import { TimetablesModule } from './modules/timetables/timetables.module';
import { ExamsModule } from './modules/exams/exams.module';
import { AssessmentsModule } from './modules/assessments/assessments.module';
import { ExamResultsModule } from './modules/exam-results/exam-results.module';
import { FeesModule } from './modules/fees/fees.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { RemindersModule } from './modules/reminders/reminders.module';
import { ReportsModule } from './modules/reports/reports.module';
import { HealthModule } from './modules/health/health.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ActivityLogsModule } from './modules/activity-logs/activity-logs.module';
import { InquiriesModule } from './modules/inquiries/inquiries.module';
import { PortalModule } from './modules/portal/portal.module';
import { OnlineClassesModule } from './modules/online-classes/online-classes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: envValidationSchema,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60_000,
          limit: 120,
        },
      ],
    }),
    ScheduleModule.forRoot(),
    CommonModule,
    PrismaModule,
    AuthModule,
    PortalAuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    OrganizationsModule,
    StudentsModule,
    BatchesModule,
    AcademicSessionsModule,
    SubjectsModule,
    TeachersModule,
    BatchSubjectAssignmentsModule,
    TimetablesModule,
    ExamsModule,
    AssessmentsModule,
    ExamResultsModule,
    FeesModule,
    AttendanceModule,
    RemindersModule,
    ReportsModule,
    HealthModule,
    ActivityLogsModule,
    InquiriesModule,
    PortalModule,
    OnlineClassesModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ModuleAccessGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
  ],
})
export class AppModule {}
