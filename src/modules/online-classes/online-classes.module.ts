import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ONLINE_CLASS_REPOSITORY } from '../../common/constants/injection-tokens';
import { OnlineClassesController } from './online-classes.controller';
import { OnlineClassesAutomationService } from './online-classes-automation.service';
import { OnlineClassAlertsService } from './online-class-alerts.service';
import { OnlineClassesService } from './online-classes.service';
import { GoogleMeetProvider } from './providers/google-meet.provider';
import { GoogleWorkspaceAuthService } from './providers/google-workspace-auth.service';
import { OnlineClassPrismaRepository } from './repositories/online-class-prisma.repository';

@Module({
  imports: [ConfigModule],
  controllers: [OnlineClassesController],
  providers: [
    OnlineClassesService,
    OnlineClassesAutomationService,
    OnlineClassAlertsService,
    GoogleWorkspaceAuthService,
    GoogleMeetProvider,
    {
      provide: ONLINE_CLASS_REPOSITORY,
      useClass: OnlineClassPrismaRepository,
    },
  ],
})
export class OnlineClassesModule {}
