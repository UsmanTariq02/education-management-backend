import { Test } from '@nestjs/testing';
import { SubscriptionStatus } from '@prisma/client';
import { AuditLogService } from '../../common/services/audit-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationSubscriptionSyncService } from './organization-subscription-sync.service';

describe('OrganizationSubscriptionSyncService', () => {
  let service: OrganizationSubscriptionSyncService;
  let prisma: {
    organization: {
      findMany: jest.Mock;
      updateMany: jest.Mock;
    };
  };
  let auditLogService: {
    log: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      organization: {
        findMany: jest.fn(),
        updateMany: jest.fn(),
      },
    };
    auditLogService = {
      log: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OrganizationSubscriptionSyncService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: AuditLogService,
          useValue: auditLogService,
        },
      ],
    }).compile();

    service = moduleRef.get(OrganizationSubscriptionSyncService);
  });

  it('syncExpiredTrialsNow should convert expired trials to past due', async () => {
    prisma.organization.findMany.mockResolvedValue([
      { id: 'org-1', name: 'Alpha School', slug: 'alpha-school' },
      { id: 'org-2', name: 'Beta Academy', slug: 'beta-academy' },
    ]);
    prisma.organization.updateMany.mockResolvedValue({ count: 2 });

    await expect(service.syncExpiredTrialsNow()).resolves.toEqual({ updatedCount: 2 });

    expect(prisma.organization.findMany).toHaveBeenCalledWith({
      where: {
        subscriptionStatus: SubscriptionStatus.TRIAL,
        trialEndsAt: {
          not: null,
          lt: expect.any(Date),
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
    expect(prisma.organization.updateMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: ['org-1', 'org-2'],
        },
      },
      data: {
        subscriptionStatus: SubscriptionStatus.PAST_DUE,
      },
    });
    expect(auditLogService.log).toHaveBeenCalledWith({
      module: 'organizations',
      action: 'trial-expired-sync',
      metadata: {
        updatedCount: 2,
        organizationIds: ['org-1', 'org-2'],
        organizations: [
          { id: 'org-1', name: 'Alpha School', slug: 'alpha-school' },
          { id: 'org-2', name: 'Beta Academy', slug: 'beta-academy' },
        ],
      },
    });
  });
});
