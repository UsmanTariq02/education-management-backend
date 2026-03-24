import { Module } from '@nestjs/common';
import { STUDENT_REPOSITORY } from '../../common/constants/injection-tokens';
import { StudentPrismaRepository } from './repositories/student-prisma.repository';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  controllers: [StudentsController],
  providers: [
    StudentsService,
    {
      provide: STUDENT_REPOSITORY,
      useClass: StudentPrismaRepository,
    },
  ],
})
export class StudentsModule {}
