import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateBatchSubjectAssignmentDto } from '../dto/create-batch-subject-assignment.dto';
import { UpdateBatchSubjectAssignmentDto } from '../dto/update-batch-subject-assignment.dto';
import {
  BatchSubjectAssignmentRepository,
  BatchSubjectAssignmentView,
} from '../interfaces/batch-subject-assignment.repository.interface';

const batchSubjectAssignmentInclude = {
  organization: { select: { id: true, name: true } },
  academicSession: { select: { id: true, name: true } },
  batch: { select: { id: true, name: true, code: true } },
  subject: { select: { id: true, name: true, code: true } },
  teacher: { select: { id: true, fullName: true } },
} satisfies Prisma.BatchSubjectAssignmentInclude;

@Injectable()
export class BatchSubjectAssignmentPrismaRepository implements BatchSubjectAssignmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateBatchSubjectAssignmentDto, organizationId: string): Promise<BatchSubjectAssignmentView> {
    const item = await this.prisma.batchSubjectAssignment.create({
      data: { ...payload, organizationId },
      include: batchSubjectAssignmentInclude,
    });
    return this.toView(item);
  }

  async findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<BatchSubjectAssignmentView>> {
    const where: Prisma.BatchSubjectAssignmentWhereInput = {
      ...(organizationId ? { organizationId } : {}),
      ...(query.search
        ? {
            OR: [
              { batch: { name: { contains: query.search, mode: 'insensitive' } } },
              { subject: { name: { contains: query.search, mode: 'insensitive' } } },
              { teacher: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { academicSession: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.batchSubjectAssignment.findMany({
        where,
        include: batchSubjectAssignmentInclude,
        ...buildPagination(query),
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
      }),
      this.prisma.batchSubjectAssignment.count({ where }),
    ]);

    return { items: items.map((item) => this.toView(item)), total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<BatchSubjectAssignmentView | null> {
    const item = await this.prisma.batchSubjectAssignment.findUnique({
      where: { id },
      include: batchSubjectAssignmentInclude,
    });
    return item ? this.toView(item) : null;
  }

  async update(
    id: string,
    payload: UpdateBatchSubjectAssignmentDto,
    organizationId?: string,
  ): Promise<BatchSubjectAssignmentView> {
    if (organizationId) {
      await this.prisma.batchSubjectAssignment.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }
    const item = await this.prisma.batchSubjectAssignment.update({
      where: { id },
      data: payload,
      include: batchSubjectAssignmentInclude,
    });
    return this.toView(item);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    if (organizationId) {
      await this.prisma.batchSubjectAssignment.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }
    await this.prisma.batchSubjectAssignment.delete({ where: { id } });
  }

  private toView(
    item: Prisma.BatchSubjectAssignmentGetPayload<{ include: typeof batchSubjectAssignmentInclude }>,
  ): BatchSubjectAssignmentView {
    return {
      id: item.id,
      organizationId: item.organization.id,
      organizationName: item.organization.name,
      academicSessionId: item.academicSession?.id ?? null,
      academicSessionName: item.academicSession?.name ?? null,
      batchId: item.batch.id,
      batchName: item.batch.name,
      batchCode: item.batch.code,
      subjectId: item.subject.id,
      subjectName: item.subject.name,
      subjectCode: item.subject.code,
      teacherId: item.teacher?.id ?? null,
      teacherName: item.teacher?.fullName ?? null,
      weeklyClasses: item.weeklyClasses,
      isPrimary: item.isPrimary,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
