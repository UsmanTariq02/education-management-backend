import { Module } from '@nestjs/common';
import { ACTIVITY_LOG_REPOSITORY } from '../../common/constants/injection-tokens';
import { ActivityLogsController } from './activity-logs.controller';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLogPrismaRepository } from './repositories/activity-log-prisma.repository';

@Module({
  controllers: [ActivityLogsController],
  providers: [
    ActivityLogsService,
    {
      provide: ACTIVITY_LOG_REPOSITORY,
      useClass: ActivityLogPrismaRepository,
    },
  ],
  exports: [ACTIVITY_LOG_REPOSITORY, ActivityLogsService],
})
export class ActivityLogsModule {}
