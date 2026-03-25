import { Module } from '@nestjs/common';
import { EXAM_RESULT_REPOSITORY } from '../../common/constants/injection-tokens';
import { ExamResultsController } from './exam-results.controller';
import { ExamResultsService } from './exam-results.service';
import { ExamResultPrismaRepository } from './repositories/exam-result-prisma.repository';

@Module({
  controllers: [ExamResultsController],
  providers: [
    ExamResultsService,
    {
      provide: EXAM_RESULT_REPOSITORY,
      useClass: ExamResultPrismaRepository,
    },
  ],
})
export class ExamResultsModule {}
