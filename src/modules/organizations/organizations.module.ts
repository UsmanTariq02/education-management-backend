import { Module } from '@nestjs/common';
import { ORGANIZATION_REPOSITORY } from '../../common/constants/injection-tokens';
import { RemindersModule } from '../reminders/reminders.module';
import { OrganizationSettingsController } from './organization-settings.controller';
import { OrganizationsController } from './organizations.controller';
import { OrganizationSubscriptionSyncService } from './organization-subscription-sync.service';
import { OrganizationsService } from './organizations.service';
import { OrganizationPrismaRepository } from './repositories/organization-prisma.repository';

@Module({
  imports: [RemindersModule],
  controllers: [OrganizationsController, OrganizationSettingsController],
  providers: [
    OrganizationsService,
    OrganizationSubscriptionSyncService,
    {
      provide: ORGANIZATION_REPOSITORY,
      useClass: OrganizationPrismaRepository,
    },
  ],
  exports: [ORGANIZATION_REPOSITORY, OrganizationsService],
})
export class OrganizationsModule {}
