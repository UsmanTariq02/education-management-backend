import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { StudentImportRow } from '../interfaces/student-import.interface';
import { StudentRepository, StudentView } from '../interfaces/student.repository.interface';

const studentInclude = {
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
  studentBatches: {
    include: {
      batch: true,
    },
  },
} satisfies Prisma.StudentInclude;

@Injectable()
export class StudentPrismaRepository implements StudentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(payload: CreateStudentDto, organizationId: string): Promise<StudentView> {
    const student = await this.prisma.student.create({
      data: {
        organizationId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        fullName: `${payload.firstName} ${payload.lastName}`.trim(),
        email: payload.email,
        phone: payload.phone,
        guardianName: payload.guardianName,
        guardianEmail: payload.guardianEmail,
        guardianPhone: payload.guardianPhone,
        address: payload.address,
        dateOfBirth: payload.dateOfBirth,
        admissionDate: payload.admissionDate,
        status: payload.status,
        studentBatches: payload.batchIds
          ? {
              createMany: {
                data: payload.batchIds.map((batchId) => ({ batchId })),
              },
            }
          : undefined,
      },
      include: studentInclude,
    });

    return this.toView(student);
  }

  async findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<StudentView>> {
    const where: Prisma.StudentWhereInput = {
      ...(organizationId ? { organizationId } : {}),
      ...(query.search
        ? {
            OR: [
              { fullName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.student.findMany({
        where,
        include: studentInclude,
        ...buildPagination(query),
        orderBy: {
          [query.sortBy ?? 'createdAt']: query.sortOrder,
        },
      }),
      this.prisma.student.count({ where }),
    ]);

    return {
      items: items.map((student) => this.toView(student)),
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async findById(id: string, organizationId?: string): Promise<StudentView | null> {
    const student = await this.prisma.student.findUnique({
      where: { id },
      include: studentInclude,
    });
    if (!student) {
      return null;
    }
    if (organizationId && student.organizationId !== organizationId) {
      return null;
    }
    return this.toView(student);
  }

  async update(id: string, payload: UpdateStudentDto, organizationId?: string): Promise<StudentView> {
    const student = await this.prisma.$transaction(async (prisma) => {
      const existingStudent = await prisma.student.findUniqueOrThrow({
        where: { id },
      });

      if (organizationId && existingStudent.organizationId !== organizationId) {
        throw new Prisma.PrismaClientKnownRequestError('Student not found', {
          code: 'P2025',
          clientVersion: 'tenant-scope',
        });
      }

      if (payload.batchIds) {
        await prisma.studentBatch.deleteMany({ where: { studentId: id } });
      }

      return prisma.student.update({
        where: { id },
        data: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          fullName:
            payload.firstName || payload.lastName
              ? `${payload.firstName ?? existingStudent.firstName} ${payload.lastName ?? existingStudent.lastName}`.trim()
              : undefined,
          email: payload.email,
          phone: payload.phone,
          guardianName: payload.guardianName,
          guardianEmail: payload.guardianEmail,
          guardianPhone: payload.guardianPhone,
          address: payload.address,
          dateOfBirth: payload.dateOfBirth,
          admissionDate: payload.admissionDate,
          status: payload.status,
          studentBatches: payload.batchIds
            ? {
                createMany: {
                  data: payload.batchIds.map((batchId) => ({ batchId })),
                },
              }
            : undefined,
        },
        include: studentInclude,
      });
    });

    return this.toView(student);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.student.delete({
      where: { id },
    });
  }

  async findExistingIdentifiers(
    emails: string[],
    phones: string[],
    organizationId: string,
  ): Promise<{ emails: Set<string>; phones: Set<string> }> {
    const orConditions: Prisma.StudentWhereInput[] = [];

    if (emails.length > 0) {
      orConditions.push({
        email: { in: emails },
      });
    }

    if (phones.length > 0) {
      orConditions.push({
        phone: { in: phones },
      });
    }

    const students = await this.prisma.student.findMany({
      where: {
        organizationId,
        OR: orConditions,
      },
      select: {
        email: true,
        phone: true,
      },
    });

    return {
      emails: new Set(
        students
          .map((student) => student.email?.toLowerCase())
          .filter((email): email is string => Boolean(email)),
      ),
      phones: new Set(students.map((student) => student.phone)),
    };
  }

  async findBatchIdsByCodes(codes: string[], organizationId: string): Promise<Map<string, string>> {
    const batches = await this.prisma.batch.findMany({
      where: {
        organizationId,
        code: { in: codes },
      },
      select: {
        id: true,
        code: true,
      },
    });

    return new Map(batches.map((batch) => [batch.code, batch.id]));
  }

  async createMany(rows: StudentImportRow[], batchIdsByCode: Map<string, string>, organizationId: string): Promise<number> {
    await this.prisma.$transaction(async (prisma) => {
      for (const row of rows) {
        const student = await prisma.student.create({
          data: {
            organizationId,
            firstName: row.firstName,
            lastName: row.lastName,
            fullName: `${row.firstName} ${row.lastName}`.trim(),
            email: row.email,
            phone: row.phone,
            guardianName: row.guardianName,
            guardianEmail: row.guardianEmail,
            guardianPhone: row.guardianPhone,
            address: row.address,
            dateOfBirth: row.dateOfBirth,
            admissionDate: row.admissionDate,
            status: row.status,
          },
        });

        const batchIds = row.batchCodes
          .map((code) => batchIdsByCode.get(code))
          .filter((batchId): batchId is string => batchId !== undefined);

        if (batchIds.length > 0) {
          await prisma.studentBatch.createMany({
            data: batchIds.map((batchId) => ({
              studentId: student.id,
              batchId,
            })),
          });
        }
      }
    });

    return rows.length;
  }

  private toView(
    student: Prisma.StudentGetPayload<{
      include: typeof studentInclude;
    }>,
  ): StudentView {
    return {
      id: student.id,
      organizationId: student.organization.id,
      organizationName: student.organization.name,
      firstName: student.firstName,
      lastName: student.lastName,
      fullName: student.fullName,
      email: student.email,
      phone: student.phone,
      guardianName: student.guardianName,
      guardianEmail: student.guardianEmail,
      guardianPhone: student.guardianPhone,
      address: student.address,
      dateOfBirth: student.dateOfBirth,
      admissionDate: student.admissionDate,
      status: student.status,
      batches: student.studentBatches.map((item) => ({
        id: item.batch.id,
        name: item.batch.name,
        code: item.batch.code,
        status: item.status,
      })),
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };
  }
}
