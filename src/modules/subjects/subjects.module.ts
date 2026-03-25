import { Module } from '@nestjs/common';
import { SUBJECT_REPOSITORY } from '../../common/constants/injection-tokens';
import { SubjectPrismaRepository } from './repositories/subject-prisma.repository';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

@Module({
  controllers: [SubjectsController],
  providers: [
    SubjectsService,
    {
      provide: SUBJECT_REPOSITORY,
      useClass: SubjectPrismaRepository,
    },
  ],
})
export class SubjectsModule {}
