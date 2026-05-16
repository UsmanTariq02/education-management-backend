import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import { ReportsService } from './reports.service';

@Injectable()
export class ReportsAutomationService {
  private readonly logger = new Logger(ReportsAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly reportsService: ReportsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Cron('0 0 8 * * 1')
  async runWeeklyPrincipalSummaries(): Promise<void> {
    const organizations = await this.prisma.organization.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });

    for (const organization of organizations) {
      try {
        const summary = await this.reportsService.generateWeeklyPrincipalSummary(organization.id, organization.name);
        await this.auditLogService.log({
          actorUserId: 'system-automation',
          module: 'reports',
          action: 'weekly-principal-summary',
          metadata: {
            organizationId: summary.organizationId,
            organizationName: summary.organizationName,
            headline: summary.headline,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown automation error';
        this.logger.error(`Weekly principal summary failed for ${organization.id}: ${message}`);
      }
    }
  }
}
