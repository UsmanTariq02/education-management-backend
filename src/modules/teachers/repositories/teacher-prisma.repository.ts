import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTeacherDto } from '../dto/create-teacher.dto';
import { UpdateTeacherDto } from '../dto/update-teacher.dto';
import { TeacherRepository, TeacherView } from '../interfaces/teacher.repository.interface';

const teacherInclude = {
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
} satisfies Prisma.TeacherInclude;

@Injectable()
export class TeacherPrismaRepository implements TeacherRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateTeacherDto, organizationId: string): Promise<TeacherView> {
    const teacher = await this.prisma.teacher.create({
      data: {
        employeeId: payload.employeeId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        phone: payload.phone,
        qualification: payload.qualification,
        specialization: payload.specialization,
        joinedAt: payload.joinedAt,
        isActive: payload.isActive,
        organizationId,
        fullName: `${payload.firstName} ${payload.lastName}`.trim(),
      },
      include: teacherInclude,
    });
    return this.toView(teacher);
  }

  async findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<TeacherView>> {
    const where: Prisma.TeacherWhereInput = {
      ...(organizationId ? { organizationId } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { employeeId: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.teacher.findMany({
        where,
        include: teacherInclude,
        ...buildPagination(query),
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return { items: items.map((item) => this.toView(item)), total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<TeacherView | null> {
    const teacher = await this.prisma.teacher.findUnique({ where: { id }, include: teacherInclude });
    return teacher ? this.toView(teacher) : null;
  }

  async update(id: string, payload: UpdateTeacherDto, organizationId?: string): Promise<TeacherView> {
    const existing = await this.prisma.teacher.findFirstOrThrow({
      where: { id, ...(organizationId ? { organizationId } : {}) },
      select: { id: true, firstName: true, lastName: true },
    });
    const teacher = await this.prisma.teacher.update({
      where: { id },
      data: {
        ...(payload.employeeId !== undefined ? { employeeId: payload.employeeId } : {}),
        ...(payload.firstName !== undefined ? { firstName: payload.firstName } : {}),
        ...(payload.lastName !== undefined ? { lastName: payload.lastName } : {}),
        ...(payload.email !== undefined ? { email: payload.email } : {}),
        ...(payload.phone !== undefined ? { phone: payload.phone } : {}),
        ...(payload.qualification !== undefined ? { qualification: payload.qualification } : {}),
        ...(payload.specialization !== undefined ? { specialization: payload.specialization } : {}),
        ...(payload.joinedAt !== undefined ? { joinedAt: payload.joinedAt } : {}),
        ...(payload.isActive !== undefined ? { isActive: payload.isActive } : {}),
        ...(payload.firstName || payload.lastName
          ? {
              fullName: `${payload.firstName ?? existing.firstName} ${payload.lastName ?? existing.lastName}`.trim(),
            }
          : {}),
      },
      include: teacherInclude,
    });
    return this.toView(teacher);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    if (organizationId) {
      await this.prisma.teacher.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }
    await this.prisma.teacher.delete({ where: { id } });
  }

  private toView(teacher: Prisma.TeacherGetPayload<{ include: typeof teacherInclude }>): TeacherView {
    return {
      id: teacher.id,
      organizationId: teacher.organization.id,
      organizationName: teacher.organization.name,
      employeeId: teacher.employeeId,
      firstName: teacher.firstName,
      lastName: teacher.lastName,
      fullName: teacher.fullName,
      email: teacher.email,
      phone: teacher.phone,
      qualification: teacher.qualification,
      specialization: teacher.specialization,
      joinedAt: teacher.joinedAt,
      isActive: teacher.isActive,
      createdAt: teacher.createdAt,
      updatedAt: teacher.updatedAt,
    };
  }
}
