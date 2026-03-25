import { Module } from '@nestjs/common';
import { ACADEMIC_SESSION_REPOSITORY } from '../../common/constants/injection-tokens';
import { AcademicSessionsController } from './academic-sessions.controller';
import { AcademicSessionsService } from './academic-sessions.service';
import { AcademicSessionPrismaRepository } from './repositories/academic-session-prisma.repository';

@Module({
  controllers: [AcademicSessionsController],
  providers: [
    AcademicSessionsService,
    {
      provide: ACADEMIC_SESSION_REPOSITORY,
      useClass: AcademicSessionPrismaRepository,
    },
  ],
})
export class AcademicSessionsModule {}
