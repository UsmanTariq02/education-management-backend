import { Module } from '@nestjs/common';
import { FEE_REPOSITORY } from '../../common/constants/injection-tokens';
import { RemindersModule } from '../reminders/reminders.module';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';
import { FeePrismaRepository } from './repositories/fee-prisma.repository';

@Module({
  imports: [RemindersModule],
  controllers: [FeesController],
  providers: [
    FeesService,
    {
      provide: FEE_REPOSITORY,
      useClass: FeePrismaRepository,
    },
  ],
})
export class FeesModule {}
