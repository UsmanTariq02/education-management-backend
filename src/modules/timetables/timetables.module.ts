import { Module } from '@nestjs/common';
import { TIMETABLE_REPOSITORY } from '../../common/constants/injection-tokens';
import { TimetablePrismaRepository } from './repositories/timetable-prisma.repository';
import { TimetablesController } from './timetables.controller';
import { TimetablesService } from './timetables.service';

@Module({
  controllers: [TimetablesController],
  providers: [
    TimetablesService,
    {
      provide: TIMETABLE_REPOSITORY,
      useClass: TimetablePrismaRepository,
    },
  ],
})
export class TimetablesModule {}
