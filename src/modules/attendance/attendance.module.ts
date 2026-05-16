import { Module } from '@nestjs/common';
import { ATTENDANCE_REPOSITORY } from '../../common/constants/injection-tokens';
import { RemindersModule } from '../reminders/reminders.module';
import { AttendanceController } from './attendance.controller';
import { AttendanceAlertAutomationService } from './attendance-alert-automation.service';
import { AttendanceService } from './attendance.service';
import { AttendancePrismaRepository } from './repositories/attendance-prisma.repository';

@Module({
  imports: [RemindersModule],
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    AttendanceAlertAutomationService,
    {
      provide: ATTENDANCE_REPOSITORY,
      useClass: AttendancePrismaRepository,
    },
  ],
})
export class AttendanceModule {}
