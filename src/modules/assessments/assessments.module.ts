import { Module } from '@nestjs/common';
import { ASSESSMENT_REPOSITORY } from '../../common/constants/injection-tokens';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { AssessmentPrismaRepository } from './repositories/assessment-prisma.repository';

@Module({
  controllers: [AssessmentsController],
  providers: [
    AssessmentsService,
    {
      provide: ASSESSMENT_REPOSITORY,
      useClass: AssessmentPrismaRepository,
    },
  ],
})
export class AssessmentsModule {}
