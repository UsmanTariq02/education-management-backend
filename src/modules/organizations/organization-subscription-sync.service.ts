import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SubscriptionStatus } from '@prisma/client';
import { AuditLogService } from '../../common/services/audit-log.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrganizationSubscriptionSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async syncExpiredTrials(): Promise<{ updatedCount: number }> {
    return this.expireTrials(new Date());
  }

  async syncExpiredTrialsNow(): Promise<{ updatedCount: number }> {
    return this.expireTrials(new Date());
  }

  private async expireTrials(now: Date): Promise<{ updatedCount: number }> {
    const expiredTrials = await this.prisma.organization.findMany({
      where: {
        subscriptionStatus: SubscriptionStatus.TRIAL,
        trialEndsAt: {
          not: null,
          lt: now,
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (expiredTrials.length === 0) {
      return { updatedCount: 0 };
    }

    await this.prisma.organization.updateMany({
      where: {
        id: {
          in: expiredTrials.map((organization) => organization.id),
        },
      },
      data: {
        subscriptionStatus: SubscriptionStatus.PAST_DUE,
      },
    });

    await this.auditLogService.log({
      module: 'organizations',
      action: 'trial-expired-sync',
      metadata: {
        updatedCount: expiredTrials.length,
        organizationIds: expiredTrials.map((organization) => organization.id),
        organizations: expiredTrials.map((organization) => ({
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
        })),
      },
    });

    return { updatedCount: expiredTrials.length };
  }
}
