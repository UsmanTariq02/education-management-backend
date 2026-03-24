import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBatchDto } from '../dto/create-batch.dto';
import { UpdateBatchDto } from '../dto/update-batch.dto';
import { BatchRepository, BatchView } from '../interfaces/batch.repository.interface';

const batchInclude = {
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.BatchInclude;

@Injectable()
export class BatchPrismaRepository implements BatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateBatchDto, organizationId: string): Promise<BatchView> {
    const batch = await this.prisma.batch.create({
      data: { ...payload, organizationId },
      include: batchInclude,
    });
    return this.toView(batch);
  }

  async findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<BatchView>> {
    const where: Prisma.BatchWhereInput = {
      ...(organizationId ? { organizationId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.batch.findMany({
        where,
        include: batchInclude,
        ...buildPagination(query),
        orderBy: {
          [query.sortBy ?? 'createdAt']: query.sortOrder,
        },
      }),
      this.prisma.batch.count({ where }),
    ]);

    return { items: items.map((item) => this.toView(item)), total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<BatchView | null> {
    const batch = await this.prisma.batch.findUnique({ where: { id }, include: batchInclude });
    return batch ? this.toView(batch) : null;
  }

  async update(id: string, payload: UpdateBatchDto, organizationId?: string): Promise<BatchView> {
    if (organizationId) {
      await this.prisma.batch.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }
    const batch = await this.prisma.batch.update({
      where: { id },
      data: payload,
      include: batchInclude,
    });
    return this.toView(batch);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.batch.delete({ where: { id } });
  }

  private toView(batch: Prisma.BatchGetPayload<{ include: typeof batchInclude }>): BatchView {
    return {
      id: batch.id,
      organizationId: batch.organization.id,
      organizationName: batch.organization.name,
      name: batch.name,
      code: batch.code,
      description: batch.description,
      startDate: batch.startDate,
      endDate: batch.endDate,
      scheduleInfo: batch.scheduleInfo,
      isActive: batch.isActive,
      createdAt: batch.createdAt,
      updatedAt: batch.updatedAt,
    };
  }
}
