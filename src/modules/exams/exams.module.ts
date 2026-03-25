import { Module } from '@nestjs/common';
import { EXAM_REPOSITORY } from '../../common/constants/injection-tokens';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { ExamPrismaRepository } from './repositories/exam-prisma.repository';

@Module({
  controllers: [ExamsController],
  providers: [
    ExamsService,
    {
      provide: EXAM_REPOSITORY,
      useClass: ExamPrismaRepository,
    },
  ],
})
export class ExamsModule {}
