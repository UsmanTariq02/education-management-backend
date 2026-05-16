import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../../common/services/audit-log.service';
import { AiService } from './ai.service';

@Injectable()
export class NoticeCampaignAutomationService {
  private readonly logger = new Logger(NoticeCampaignAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Cron('0 */15 * * * *')
  async publishDueNoticeCampaigns(): Promise<void> {
    try {
      const result = await this.aiService.publishDueNoticeCampaigns();
      if (result.publishedCount > 0) {
        this.logger.log(
          `Published ${result.publishedCount} due notice campaign${result.publishedCount === 1 ? '' : 's'} across ${result.processedOrganizations} organization${result.processedOrganizations === 1 ? '' : 's'}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown automation error';
      this.logger.error(`Notice campaign automation failed: ${message}`);
    }
  }

  async seedPublishedNoticeCampaignsForOrganization(organizationId: string, organizationName: string): Promise<void> {
    const campaigns = await this.prisma.announcement.findMany({
      where: { organizationId },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: 5,
    });

    for (const campaign of campaigns) {
      await this.auditLogService.log({
        actorUserId: 'system-automation',
        module: 'ai',
        action: 'notice-campaign-history',
        targetId: campaign.id,
        metadata: {
          organizationId,
          organizationName,
          category: campaign.category,
          audience: campaign.audience,
          isPublished: campaign.isPublished,
          publishedAt: campaign.publishedAt?.toISOString() ?? null,
        },
      });
    }
  }
}
