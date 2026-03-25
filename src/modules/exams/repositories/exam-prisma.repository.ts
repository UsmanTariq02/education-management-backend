import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateExamDto } from '../dto/create-exam.dto';
import { UpdateExamDto } from '../dto/update-exam.dto';
import { ExamRepository, ExamView } from '../interfaces/exam.repository.interface';

const examInclude = {
  organization: { select: { id: true, name: true } },
  academicSession: { select: { id: true, name: true } },
  batch: { select: { id: true, name: true, code: true } },
  teacher: { select: { id: true, fullName: true } },
  examSubjects: {
    include: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  },
} satisfies Prisma.ExamInclude;

@Injectable()
export class ExamPrismaRepository implements ExamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateExamDto, organizationId: string): Promise<ExamView> {
    const exam = await this.prisma.exam.create({
      data: {
        organizationId,
        academicSessionId: payload.academicSessionId,
        batchId: payload.batchId,
        teacherId: payload.teacherId,
        name: payload.name,
        code: payload.code,
        description: payload.description,
        examDate: payload.examDate,
        isPublished: payload.isPublished,
        examSubjects: {
          create: payload.subjects.map((subject) => ({
            subjectId: subject.subjectId,
            totalMarks: subject.totalMarks,
            passMarks: subject.passMarks,
          })),
        },
      },
      include: examInclude,
    });
    return this.toView(exam);
  }

  async findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<ExamView>> {
    const where: Prisma.ExamWhereInput = {
      ...(organizationId ? { organizationId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { code: { contains: query.search, mode: 'insensitive' } },
              { batch: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.exam.findMany({
        where,
        include: examInclude,
        ...buildPagination(query),
        orderBy: { [query.sortBy ?? 'examDate']: query.sortOrder },
      }),
      this.prisma.exam.count({ where }),
    ]);
    return { items: items.map((item) => this.toView(item)), total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<ExamView | null> {
    const exam = await this.prisma.exam.findUnique({ where: { id }, include: examInclude });
    return exam ? this.toView(exam) : null;
  }

  async update(id: string, payload: UpdateExamDto, organizationId?: string): Promise<ExamView> {
    if (organizationId) {
      await this.prisma.exam.findFirstOrThrow({ where: { id, organizationId }, select: { id: true } });
    }
    const exam = await this.prisma.$transaction(async (tx) => {
      if (payload.subjects) {
        await tx.examSubject.deleteMany({ where: { examId: id } });
      }
      return tx.exam.update({
        where: { id },
        data: {
          academicSessionId: payload.academicSessionId,
          batchId: payload.batchId,
          teacherId: payload.teacherId,
          name: payload.name,
          code: payload.code,
          description: payload.description,
          examDate: payload.examDate,
          isPublished: payload.isPublished,
          ...(payload.subjects
            ? {
                examSubjects: {
                  create: payload.subjects.map((subject) => ({
                    subjectId: subject.subjectId,
                    totalMarks: subject.totalMarks,
                    passMarks: subject.passMarks,
                  })),
                },
              }
            : {}),
        },
        include: examInclude,
      });
    });
    return this.toView(exam);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    if (organizationId) {
      await this.prisma.exam.findFirstOrThrow({ where: { id, organizationId }, select: { id: true } });
    }
    await this.prisma.exam.delete({ where: { id } });
  }

  private toView(exam: Prisma.ExamGetPayload<{ include: typeof examInclude }>): ExamView {
    return {
      id: exam.id,
      organizationId: exam.organization.id,
      organizationName: exam.organization.name,
      academicSessionId: exam.academicSession?.id ?? null,
      academicSessionName: exam.academicSession?.name ?? null,
      batchId: exam.batch.id,
      batchName: exam.batch.name,
      batchCode: exam.batch.code,
      teacherId: exam.teacher?.id ?? null,
      teacherName: exam.teacher?.fullName ?? null,
      name: exam.name,
      code: exam.code,
      description: exam.description,
      examDate: exam.examDate,
      isPublished: exam.isPublished,
      subjects: exam.examSubjects.map((subject) => ({
        id: subject.id,
        subjectId: subject.subject.id,
        subjectName: subject.subject.name,
        subjectCode: subject.subject.code,
        totalMarks: Number(subject.totalMarks),
        passMarks: Number(subject.passMarks),
      })),
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
    };
  }
}
