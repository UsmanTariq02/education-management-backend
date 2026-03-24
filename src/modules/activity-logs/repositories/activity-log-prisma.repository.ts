import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { ActivityLogQueryDto } from '../dto/activity-log-query.dto';
import { ActivityLogResponseDto } from '../dto/activity-log-response.dto';
import { ActivityLogRepository } from '../interfaces/activity-log.repository.interface';

const actorSelect = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.UserSelect;

const organizationSelect = {
  id: true,
  name: true,
} satisfies Prisma.OrganizationSelect;

@Injectable()
export class ActivityLogPrismaRepository implements ActivityLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(query: ActivityLogQueryDto, organizationId?: string): Promise<PaginatedResult<ActivityLogResponseDto>> {
    const where: Prisma.AuditLogWhereInput = {
      ...(organizationId ? { organizationId } : {}),
      ...(query.module ? { module: { equals: query.module, mode: 'insensitive' } } : {}),
      ...(query.action ? { action: { equals: query.action, mode: 'insensitive' } } : {}),
      ...(query.actorUserId ? { actorUserId: query.actorUserId } : {}),
      ...(query.targetId ? { targetId: query.targetId } : {}),
      ...(query.search
        ? {
            OR: [
              { module: { contains: query.search, mode: 'insensitive' } },
              { action: { contains: query.search, mode: 'insensitive' } },
              { targetId: { contains: query.search, mode: 'insensitive' } },
              { actorUser: { is: { firstName: { contains: query.search, mode: 'insensitive' } } } },
              { actorUser: { is: { lastName: { contains: query.search, mode: 'insensitive' } } } },
              { actorUser: { is: { email: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          organization: {
            select: organizationSelect,
          },
          actorUser: {
            select: actorSelect,
          },
        },
        ...buildPagination(query),
        orderBy: {
          [query.sortBy ?? 'createdAt']: query.sortOrder,
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items: items.map((item) => ({
        id: item.id,
        organizationId: item.organizationId,
        organizationName: item.organization?.name ?? null,
        actorUserId: item.actorUserId,
        module: item.module,
        action: item.action,
        targetId: item.targetId,
        metadata: (item.metadata as Record<string, unknown> | null) ?? null,
        createdAt: item.createdAt,
        actorUser: item.actorUser,
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
