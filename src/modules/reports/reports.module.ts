import { Module } from '@nestjs/common';
import { REPORT_REPOSITORY } from '../../common/constants/injection-tokens';
import { ReportPrismaRepository } from './repositories/report-prisma.repository';
import { ReportsController } from './reports.controller';
import { ReportsAutomationService } from './reports-automation.service';
import { ReportsService } from './reports.service';

@Module({
  controllers: [ReportsController],
  providers: [
    ReportsService,
    ReportsAutomationService,
    {
      provide: REPORT_REPOSITORY,
      useClass: ReportPrismaRepository,
    },
  ],
})
export class ReportsModule {}
