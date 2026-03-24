import { Module } from '@nestjs/common';
import { BATCH_REPOSITORY } from '../../common/constants/injection-tokens';
import { BatchPrismaRepository } from './repositories/batch-prisma.repository';
import { BatchesController } from './batches.controller';
import { BatchesService } from './batches.service';

@Module({
  controllers: [BatchesController],
  providers: [
    BatchesService,
    {
      provide: BATCH_REPOSITORY,
      useClass: BatchPrismaRepository,
    },
  ],
})
export class BatchesModule {}
