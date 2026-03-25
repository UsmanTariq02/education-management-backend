import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateSubjectDto } from '../dto/create-subject.dto';
import { UpdateSubjectDto } from '../dto/update-subject.dto';
import { SubjectRepository, SubjectView } from '../interfaces/subject.repository.interface';

const subjectInclude = {
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.SubjectInclude;

@Injectable()
export class SubjectPrismaRepository implements SubjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateSubjectDto, organizationId: string): Promise<SubjectView> {
    const subject = await this.prisma.subject.create({
      data: { ...payload, organizationId },
      include: subjectInclude,
    });
    return this.toView(subject);
  }

  async findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<SubjectView>> {
    const where: Prisma.SubjectWhereInput = {
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
      this.prisma.subject.findMany({
        where,
        include: subjectInclude,
        ...buildPagination(query),
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
      }),
      this.prisma.subject.count({ where }),
    ]);

    return { items: items.map((item) => this.toView(item)), total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<SubjectView | null> {
    const subject = await this.prisma.subject.findUnique({ where: { id }, include: subjectInclude });
    return subject ? this.toView(subject) : null;
  }

  async update(id: string, payload: UpdateSubjectDto, organizationId?: string): Promise<SubjectView> {
    if (organizationId) {
      await this.prisma.subject.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }
    const subject = await this.prisma.subject.update({
      where: { id },
      data: payload,
      include: subjectInclude,
    });
    return this.toView(subject);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    if (organizationId) {
      await this.prisma.subject.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }
    await this.prisma.subject.delete({ where: { id } });
  }

  private toView(subject: Prisma.SubjectGetPayload<{ include: typeof subjectInclude }>): SubjectView {
    return {
      id: subject.id,
      organizationId: subject.organization.id,
      organizationName: subject.organization.name,
      name: subject.name,
      code: subject.code,
      description: subject.description,
      isActive: subject.isActive,
      createdAt: subject.createdAt,
      updatedAt: subject.updatedAt,
    };
  }
}
