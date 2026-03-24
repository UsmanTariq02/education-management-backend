import { Module } from '@nestjs/common';
import { ATTENDANCE_REPOSITORY } from '../../common/constants/injection-tokens';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { AttendancePrismaRepository } from './repositories/attendance-prisma.repository';

@Module({
  controllers: [AttendanceController],
  providers: [
    AttendanceService,
    {
      provide: ATTENDANCE_REPOSITORY,
      useClass: AttendancePrismaRepository,
    },
  ],
})
export class AttendanceModule {}
