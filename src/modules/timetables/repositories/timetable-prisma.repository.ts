import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateTimetableEntryDto } from '../dto/create-timetable-entry.dto';
import { UpdateTimetableEntryDto } from '../dto/update-timetable-entry.dto';
import { TimetableEntryView, TimetableRepository } from '../interfaces/timetable.repository.interface';

const timetableInclude = {
  organization: { select: { id: true, name: true } },
  academicSession: { select: { id: true, name: true } },
  batch: { select: { id: true, name: true, code: true } },
  subject: { select: { id: true, name: true, code: true } },
  teacher: { select: { id: true, fullName: true } },
} satisfies Prisma.TimetableEntryInclude;

@Injectable()
export class TimetablePrismaRepository implements TimetableRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateTimetableEntryDto, organizationId: string): Promise<TimetableEntryView> {
    const item = await this.prisma.timetableEntry.create({
      data: { ...((payload as unknown) as Record<string, unknown>), organizationId } as never,
      include: timetableInclude,
    });
    return this.toView(item);
  }

  async findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<TimetableEntryView>> {
    const where: Prisma.TimetableEntryWhereInput = {
      ...(organizationId ? { organizationId } : {}),
      ...(query.search
        ? {
            OR: [
              { batch: { name: { contains: query.search, mode: 'insensitive' } } },
              { subject: { name: { contains: query.search, mode: 'insensitive' } } },
              { teacher: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { room: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.timetableEntry.findMany({
        where,
        include: timetableInclude,
        ...buildPagination(query),
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      }),
      this.prisma.timetableEntry.count({ where }),
    ]);

    return { items: items.map((item) => this.toView(item)), total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<TimetableEntryView | null> {
    const item = await this.prisma.timetableEntry.findUnique({ where: { id }, include: timetableInclude });
    return item ? this.toView(item) : null;
  }

  async update(id: string, payload: UpdateTimetableEntryDto, organizationId?: string): Promise<TimetableEntryView> {
    if (organizationId) {
      await this.prisma.timetableEntry.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }
    const item = await this.prisma.timetableEntry.update({
      where: { id },
      data: payload as never,
      include: timetableInclude,
    });
    return this.toView(item);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    if (organizationId) {
      await this.prisma.timetableEntry.findFirstOrThrow({
        where: { id, organizationId },
        select: { id: true },
      });
    }
    await this.prisma.timetableEntry.delete({ where: { id } });
  }

  private toView(item: Prisma.TimetableEntryGetPayload<{ include: typeof timetableInclude }>): TimetableEntryView {
    const rawItem = item as unknown as Record<string, unknown>;
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
      dayOfWeek: item.dayOfWeek,
      startTime: item.startTime,
      endTime: item.endTime,
      deliveryMode: (rawItem.deliveryMode as TimetableEntryView['deliveryMode'] | undefined) ?? 'OFFLINE',
      onlineClassProvider: (rawItem.onlineClassProvider as TimetableEntryView['onlineClassProvider'] | undefined) ?? null,
      onlineMeetingUrl: (rawItem.onlineMeetingUrl as string | null | undefined) ?? null,
      onlineMeetingCode: (rawItem.onlineMeetingCode as string | null | undefined) ?? null,
      externalCalendarEventId: (rawItem.externalCalendarEventId as string | null | undefined) ?? null,
      autoAttendanceEnabled: (rawItem.autoAttendanceEnabled as boolean | undefined) ?? false,
      attendanceJoinThresholdMinutes: (rawItem.attendanceJoinThresholdMinutes as number | undefined) ?? 5,
      room: item.room,
      notes: item.notes,
      isActive: item.isActive,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }
}
