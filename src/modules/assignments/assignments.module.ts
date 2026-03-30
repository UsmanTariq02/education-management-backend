import { Module } from '@nestjs/common';
import { ASSIGNMENT_REPOSITORY } from '../../common/constants/injection-tokens';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { AssignmentPrismaRepository } from './repositories/assignment-prisma.repository';

@Module({
  controllers: [AssignmentsController],
  providers: [
    AssignmentsService,
    {
      provide: ASSIGNMENT_REPOSITORY,
      useClass: AssignmentPrismaRepository,
    },
  ],
})
export class AssignmentsModule {}
