import { Module } from '@nestjs/common';
import { BATCH_SUBJECT_ASSIGNMENT_REPOSITORY } from '../../common/constants/injection-tokens';
import { BatchSubjectAssignmentsController } from './batch-subject-assignments.controller';
import { BatchSubjectAssignmentsService } from './batch-subject-assignments.service';
import { BatchSubjectAssignmentPrismaRepository } from './repositories/batch-subject-assignment-prisma.repository';

@Module({
  controllers: [BatchSubjectAssignmentsController],
  providers: [
    BatchSubjectAssignmentsService,
    {
      provide: BATCH_SUBJECT_ASSIGNMENT_REPOSITORY,
      useClass: BatchSubjectAssignmentPrismaRepository,
    },
  ],
})
export class BatchSubjectAssignmentsModule {}
