import { Module } from '@nestjs/common';
import { TEACHER_REPOSITORY } from '../../common/constants/injection-tokens';
import { RolesModule } from '../roles/roles.module';
import { TeacherPrismaRepository } from './repositories/teacher-prisma.repository';
import { TeachersController } from './teachers.controller';
import { TeachersService } from './teachers.service';

@Module({
  imports: [RolesModule],
  controllers: [TeachersController],
  providers: [
    TeachersService,
    {
      provide: TEACHER_REPOSITORY,
      useClass: TeacherPrismaRepository,
    },
  ],
})
export class TeachersModule {}
