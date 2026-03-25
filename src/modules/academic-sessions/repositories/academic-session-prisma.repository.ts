import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAcademicSessionDto } from '../dto/create-academic-session.dto';
import { UpdateAcademicSessionDto } from '../dto/update-academic-session.dto';
import {
  AcademicSessionRepository,
  AcademicSessionView,
} from '../interfaces/academic-session.repository.interface';

const academicSessionInclude = {
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.AcademicSessionInclude;

@Injectable()
export class AcademicSessionPrismaRepository implements AcademicSessionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateAcademicSessionDto, organizationId: string): Promise<AcademicSessionView> {
    const session = await this.prisma.$transaction(async (tx) => {
      if (payload.isCurrent) {
        await tx.academicSession.updateMany({
          where: { organizationId, isCurrent: true },
          data: { isCurrent: false },
        });
      }

      return tx.academicSession.create({
        data: {
          ...payload,
          organizationId,
        },
        include: academicSessionInclude,
      });
    });

    return this.toView(session);
  }

  async findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<AcademicSessionView>> {
    const where: Prisma.AcademicSessionWhereInput = {
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
      this.prisma.academicSession.findMany({
        where,
        include: academicSessionInclude,
        ...buildPagination(query),
        orderBy: { [query.sortBy ?? 'startDate']: query.sortOrder },
      }),
      this.prisma.academicSession.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toView(item)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findById(id: string): Promise<AcademicSessionView | null> {
    const session = await this.prisma.academicSession.findUnique({
      where: { id },
      include: academicSessionInclude,
    });
    return session ? this.toView(session) : null;
  }

  async update(id: string, payload: UpdateAcademicSessionDto, organizationId?: string): Promise<AcademicSessionView> {
    const existing = await this.prisma.academicSession.findFirstOrThrow({
      where: {
        id,
        ...(organizationId ? { organizationId } : {}),
      },
      select: {
        id: true,
        organizationId: true,
      },
    });

    const session = await this.prisma.$transaction(async (tx) => {
      if (payload.isCurrent) {
        await tx.academicSession.updateMany({
          where: {
            organizationId: existing.organizationId,
            isCurrent: true,
            id: { not: id },
          },
          data: { isCurrent: false },
        });
      }

      return tx.academicSession.update({
        where: { id },
        data: payload,
        include: academicSessionInclude,
      });
    });

    return this.toView(session);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    if (organizationId) {
      await this.prisma.academicSession.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }

    await this.prisma.academicSession.delete({ where: { id } });
  }

  private toView(
    session: Prisma.AcademicSessionGetPayload<{ include: typeof academicSessionInclude }>,
  ): AcademicSessionView {
    return {
      id: session.id,
      organizationId: session.organization.id,
      organizationName: session.organization.name,
      name: session.name,
      code: session.code,
      description: session.description,
      startDate: session.startDate,
      endDate: session.endDate,
      isCurrent: session.isCurrent,
      isActive: session.isActive,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    };
  }
}
