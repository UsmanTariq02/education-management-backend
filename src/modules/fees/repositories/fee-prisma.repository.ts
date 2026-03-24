import { Injectable } from '@nestjs/common';
import { FeePlan, FeeRecord, Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateFeePlanDto } from '../dto/create-fee-plan.dto';
import { CreateFeeRecordDto } from '../dto/create-fee-record.dto';
import { UpdateFeeRecordDto } from '../dto/update-fee-record.dto';
import { FeeRepository } from '../interfaces/fee.repository.interface';

@Injectable()
export class FeePrismaRepository implements FeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createPlan(payload: CreateFeePlanDto, organizationId: string): Promise<FeePlan> {
    return this.prisma.feePlan.create({
      data: {
        ...payload,
        organizationId,
        monthlyFee: new Prisma.Decimal(payload.monthlyFee),
      },
    });
  }

  async listPlans(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<FeePlan>> {
    const where: Prisma.FeePlanWhereInput | undefined = organizationId ? { organizationId } : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.feePlan.findMany({
        where,
        ...buildPagination(query),
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
      }),
      this.prisma.feePlan.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async createRecord(payload: CreateFeeRecordDto, organizationId: string): Promise<FeeRecord> {
    return this.prisma.feeRecord.create({
      data: {
        ...payload,
        organizationId,
        amountDue: new Prisma.Decimal(payload.amountDue),
        amountPaid: new Prisma.Decimal(payload.amountPaid),
      },
    });
  }

  async listRecords(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<FeeRecord>> {
    const where: Prisma.FeeRecordWhereInput | undefined = organizationId ? { organizationId } : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.feeRecord.findMany({
        where,
        ...buildPagination(query),
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
      }),
      this.prisma.feeRecord.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async updateRecord(id: string, payload: UpdateFeeRecordDto, organizationId?: string): Promise<FeeRecord> {
    if (organizationId) {
      await this.prisma.feeRecord.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }

    return this.prisma.feeRecord.update({
      where: { id },
      data: {
        ...payload,
        amountDue: payload.amountDue !== undefined ? new Prisma.Decimal(payload.amountDue) : undefined,
        amountPaid: payload.amountPaid !== undefined ? new Prisma.Decimal(payload.amountPaid) : undefined,
        paidAt: payload.amountPaid && payload.amountPaid > 0 ? new Date() : undefined,
      },
    });
  }

  async deleteRecord(id: string, organizationId?: string): Promise<void> {
    if (organizationId) {
      await this.prisma.feeRecord.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }

    await this.prisma.feeRecord.delete({ where: { id } });
  }
}
