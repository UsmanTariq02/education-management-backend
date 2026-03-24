import { Injectable } from '@nestjs/common';
import { Attendance, Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAttendanceDto } from '../dto/create-attendance.dto';
import { UpdateAttendanceDto } from '../dto/update-attendance.dto';
import { AttendanceRepository } from '../interfaces/attendance.repository.interface';

@Injectable()
export class AttendancePrismaRepository implements AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateAttendanceDto, organizationId: string): Promise<Attendance> {
    return this.prisma.attendance.create({ data: { ...payload, organizationId } });
  }

  async findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<Attendance>> {
    const where: Prisma.AttendanceWhereInput | undefined = organizationId ? { organizationId } : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.attendance.findMany({
        where,
        ...buildPagination(query),
        orderBy: { [query.sortBy ?? 'attendanceDate']: query.sortOrder },
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return { items, total, page: query.page, limit: query.limit };
  }

  async update(id: string, payload: UpdateAttendanceDto, organizationId?: string): Promise<Attendance> {
    if (organizationId) {
      await this.prisma.attendance.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }

    return this.prisma.attendance.update({
      where: { id },
      data: payload,
    });
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    if (organizationId) {
      await this.prisma.attendance.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }

    await this.prisma.attendance.delete({ where: { id } });
  }
}
