import { Injectable } from '@nestjs/common';
import { Prisma, StudentExamResultStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateExamResultDto } from '../dto/create-exam-result.dto';
import { UpdateExamResultDto } from '../dto/update-exam-result.dto';
import { ExamResultRepository, ExamResultView } from '../interfaces/exam-result.repository.interface';

const resultInclude = {
  organization: { select: { id: true, name: true } },
  academicSession: { select: { id: true, name: true } },
  exam: { select: { id: true, name: true, code: true } },
  student: { select: { id: true, fullName: true } },
  batch: { select: { id: true, name: true } },
  resultItems: {
    include: {
      subject: { select: { id: true, name: true, code: true } },
      examSubject: { select: { totalMarks: true, passMarks: true } },
    },
  },
} satisfies Prisma.StudentExamResultInclude;

@Injectable()
export class ExamResultPrismaRepository implements ExamResultRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateExamResultDto, organizationId: string): Promise<ExamResultView> {
    const exam = await this.prisma.exam.findFirstOrThrow({
      where: { id: payload.examId, organizationId },
      include: {
        examSubjects: true,
        batch: { select: { id: true } },
        academicSession: { select: { id: true } },
      },
    });
    const totalMarks = exam.examSubjects.reduce((sum, item) => sum + Number(item.totalMarks), 0);
    const totalObtained = payload.items.reduce((sum, item) => sum + item.obtainedMarks, 0);
    const percentage = totalMarks > 0 ? Number(((totalObtained / totalMarks) * 100).toFixed(2)) : 0;
    const grade = this.getGrade(percentage);
    const status = payload.status ?? StudentExamResultStatus.DRAFT;
    const publishedAt = status === StudentExamResultStatus.PUBLISHED ? new Date() : null;

    const result = await this.prisma.studentExamResult.create({
      data: {
        organizationId,
        academicSessionId: exam.academicSession?.id ?? null,
        examId: payload.examId,
        studentId: payload.studentId,
        batchId: exam.batch.id,
        totalObtained,
        percentage,
        grade,
        remarks: payload.remarks,
        status,
        publishedAt,
        resultItems: {
          create: payload.items.map((item) => ({
            organizationId,
            examSubjectId: item.examSubjectId,
            subjectId: item.subjectId,
            obtainedMarks: item.obtainedMarks,
            grade: this.getGrade(totalMarks > 0 ? (item.obtainedMarks / totalMarks) * 100 : 0),
            remarks: item.remarks,
          })),
        },
      },
      include: resultInclude,
    });
    return this.toView(result);
  }

  async findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<ExamResultView>> {
    const where: Prisma.StudentExamResultWhereInput = {
      ...(organizationId ? { organizationId } : {}),
      ...(query.search
        ? {
            OR: [
              { exam: { name: { contains: query.search, mode: 'insensitive' } } },
              { student: { fullName: { contains: query.search, mode: 'insensitive' } } },
              { batch: { name: { contains: query.search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.studentExamResult.findMany({
        where,
        include: resultInclude,
        ...buildPagination(query),
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder },
      }),
      this.prisma.studentExamResult.count({ where }),
    ]);
    return { items: items.map((item) => this.toView(item)), total, page: query.page, limit: query.limit };
  }

  async findById(id: string): Promise<ExamResultView | null> {
    const item = await this.prisma.studentExamResult.findUnique({ where: { id }, include: resultInclude });
    return item ? this.toView(item) : null;
  }

  async update(id: string, payload: UpdateExamResultDto, organizationId?: string): Promise<ExamResultView> {
    const existing = await this.prisma.studentExamResult.findFirstOrThrow({
      where: { id, ...(organizationId ? { organizationId } : {}) },
      select: { id: true, organizationId: true, examId: true, studentId: true },
    });
    const exam = await this.prisma.exam.findFirstOrThrow({
      where: { id: payload.examId ?? existing.examId, organizationId: existing.organizationId },
      include: {
        examSubjects: true,
        batch: { select: { id: true } },
        academicSession: { select: { id: true } },
      },
    });
    const items = payload.items ?? [];
    const totalMarks = exam.examSubjects.reduce((sum, item) => sum + Number(item.totalMarks), 0);
    const totalObtained = items.length > 0 ? items.reduce((sum, item) => sum + item.obtainedMarks, 0) : undefined;
    const percentage = totalObtained !== undefined && totalMarks > 0 ? Number(((totalObtained / totalMarks) * 100).toFixed(2)) : undefined;
    const grade = percentage !== undefined ? this.getGrade(percentage) : undefined;
    const status = payload.status;

    const result = await this.prisma.$transaction(async (tx) => {
      if (payload.items) {
        await tx.studentExamResultItem.deleteMany({ where: { resultId: id } });
      }
      return tx.studentExamResult.update({
        where: { id },
        data: {
          academicSessionId: exam.academicSession?.id ?? null,
          examId: payload.examId,
          studentId: payload.studentId,
          batchId: exam.batch.id,
          totalObtained,
          percentage,
          grade,
          remarks: payload.remarks,
          status,
          ...(status === StudentExamResultStatus.PUBLISHED ? { publishedAt: new Date() } : {}),
          ...(payload.items
            ? {
                resultItems: {
                  create: payload.items.map((item) => ({
                    organizationId: existing.organizationId,
                    examSubjectId: item.examSubjectId,
                    subjectId: item.subjectId,
                    obtainedMarks: item.obtainedMarks,
                    grade: this.getGrade(totalMarks > 0 ? (item.obtainedMarks / totalMarks) * 100 : 0),
                    remarks: item.remarks,
                  })),
                },
              }
            : {}),
        },
        include: resultInclude,
      });
    });
    return this.toView(result);
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    if (organizationId) {
      await this.prisma.studentExamResult.findFirstOrThrow({ where: { id, organizationId }, select: { id: true } });
    }
    await this.prisma.studentExamResult.delete({ where: { id } });
  }

  private toView(item: Prisma.StudentExamResultGetPayload<{ include: typeof resultInclude }>): ExamResultView {
    return {
      id: item.id,
      organizationId: item.organization.id,
      organizationName: item.organization.name,
      academicSessionId: item.academicSession?.id ?? null,
      academicSessionName: item.academicSession?.name ?? null,
      examId: item.exam.id,
      examName: item.exam.name,
      examCode: item.exam.code,
      studentId: item.student.id,
      studentName: item.student.fullName,
      batchId: item.batch.id,
      batchName: item.batch.name,
      totalObtained: Number(item.totalObtained),
      percentage: Number(item.percentage),
      grade: item.grade,
      remarks: item.remarks,
      status: item.status,
      publishedAt: item.publishedAt,
      items: item.resultItems.map((resultItem) => ({
        id: resultItem.id,
        examSubjectId: resultItem.examSubjectId,
        subjectId: resultItem.subject.id,
        subjectName: resultItem.subject.name,
        subjectCode: resultItem.subject.code,
        obtainedMarks: Number(resultItem.obtainedMarks),
        totalMarks: Number(resultItem.examSubject.totalMarks),
        passMarks: Number(resultItem.examSubject.passMarks),
        grade: resultItem.grade,
        remarks: resultItem.remarks,
      })),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  private getGrade(percentage: number): string {
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B';
    if (percentage >= 60) return 'C';
    if (percentage >= 50) return 'D';
    return 'F';
  }
}
