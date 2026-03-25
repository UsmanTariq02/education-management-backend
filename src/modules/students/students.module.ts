import { Module } from '@nestjs/common';
import { STUDENT_REPOSITORY } from '../../common/constants/injection-tokens';
import { PrismaModule } from '../../prisma/prisma.module';
import { StudentPrismaRepository } from './repositories/student-prisma.repository';
import { StudentsController } from './students.controller';
import { StudentsService } from './students.service';

@Module({
  imports: [PrismaModule],
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
