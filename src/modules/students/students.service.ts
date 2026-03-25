import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PortalAccountType } from '@prisma/client';
import { STUDENT_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { OrganizationModule } from '../../common/enums/organization-module.enum';
import { AuditLogService } from '../../common/services/audit-log.service';
import { OrganizationAccessService } from '../../common/services/organization-access.service';
import { PasswordUtil } from '../../common/utils/password.util';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { UpsertPortalAccessDto } from './dto/upsert-portal-access.dto';
import { StudentImportSummary } from './interfaces/student-import.interface';
import { StudentRepository } from './interfaces/student.repository.interface';
import { parseStudentCsv, studentImportSampleCsv } from './utils/student-import.util';

@Injectable()
export class StudentsService {
  constructor(
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepository: StudentRepository,
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly organizationAccessService: OrganizationAccessService,
  ) {}

  async create(payload: CreateStudentDto, actor: CurrentUserContext) {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }
    await this.organizationAccessService.assertModuleEnabled(actor.organizationId, OrganizationModule.STUDENTS);
    await this.organizationAccessService.assertStudentLimitNotReached(actor.organizationId);
    const student = await this.studentRepository.create(payload, actor.organizationId);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'students',
      action: 'create',
      targetId: student.id,
      metadata: {
        fullName: student.fullName,
        status: student.status,
        batchCodes: student.batches.map((item) => item.code),
      },
    });
    return student;
  }

  async findAll(query: PaginationQueryDto, actor: CurrentUserContext) {
    return this.studentRepository.findMany(
      query,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
  }

  async findOne(id: string, actor: CurrentUserContext) {
    const student = await this.studentRepository.findById(
      id,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );
    if (!student) {
      throw new NotFoundException('Student not found');
    }
    return student;
  }

  async update(id: string, payload: UpdateStudentDto, actor: CurrentUserContext) {
    const student = await this.studentRepository.update(
      id,
      payload,
      actor.roles.includes('SUPER_ADMIN') ? undefined : (actor.organizationId ?? undefined),
    );

    if (payload.email) {
      await this.prisma.portalAccount.updateMany({
        where: { studentId: id, type: PortalAccountType.STUDENT },
        data: { email: payload.email.trim().toLowerCase() },
      });
    }

    if (payload.guardianEmail) {
      await this.prisma.portalAccount.updateMany({
        where: { studentId: id, type: PortalAccountType.PARENT },
        data: { email: payload.guardianEmail.trim().toLowerCase() },
      });
    }

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'students',
      action: 'update',
      targetId: id,
      metadata: {
        fullName: student.fullName,
        status: student.status,
        batchCodes: student.batches.map((item) => item.code),
      },
    });
    return student;
  }

  async getPortalAccess(id: string, actor: CurrentUserContext) {
    const student = await this.findOne(id, actor);
    const accounts = await this.prisma.portalAccount.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'asc' },
    });

    const studentAccount = accounts.find((item) => item.type === PortalAccountType.STUDENT) ?? null;
    const parentAccount = accounts.find((item) => item.type === PortalAccountType.PARENT) ?? null;

    return {
      studentId: student.id,
      studentName: student.fullName,
      studentEmail: student.email,
      guardianEmail: student.guardianEmail,
      studentAccount: studentAccount
        ? {
            id: studentAccount.id,
            email: studentAccount.email,
            isActive: studentAccount.isActive,
            lastLoginAt: studentAccount.lastLoginAt,
          }
        : null,
      parentAccount: parentAccount
        ? {
            id: parentAccount.id,
            email: parentAccount.email,
            isActive: parentAccount.isActive,
            lastLoginAt: parentAccount.lastLoginAt,
          }
        : null,
    };
  }

  async upsertPortalAccess(id: string, payload: UpsertPortalAccessDto, actor: CurrentUserContext) {
    const student = await this.findOne(id, actor);

    const result = {
      studentAccount: await this.upsertPortalAccount(student.id, PortalAccountType.STUDENT, student.email, {
        enabled: payload.studentEnabled,
        password: payload.studentPassword,
      }),
      parentAccount: await this.upsertPortalAccount(student.id, PortalAccountType.PARENT, student.guardianEmail, {
        enabled: payload.parentEnabled,
        password: payload.parentPassword,
      }),
    };

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'students',
      action: 'portal-access-upsert',
      targetId: student.id,
      metadata: {
        studentAccountActive: result.studentAccount?.isActive ?? false,
        parentAccountActive: result.parentAccount?.isActive ?? false,
      },
    });

    return this.getPortalAccess(student.id, actor);
  }

  async delete(id: string, actor: CurrentUserContext): Promise<void> {
    await this.studentRepository.delete(id);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'students',
      action: 'delete',
      targetId: id,
      metadata: { deleted: true },
    });
  }

  async downloadImportSample(): Promise<string> {
    return studentImportSampleCsv;
  }

  async importCsv(file: Buffer, actor: CurrentUserContext): Promise<StudentImportSummary> {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }
    await this.organizationAccessService.assertModuleEnabled(actor.organizationId, OrganizationModule.STUDENTS);
    const { rows, errors } = parseStudentCsv(file);
    const seenEmails = new Set<string>();
    const seenPhones = new Set<string>();
    const validRows = [];

    for (const row of rows) {
      if (row.email) {
        if (seenEmails.has(row.email.toLowerCase())) {
          errors.push({ rowNumber: row.rowNumber, message: `Duplicate email "${row.email}" in file` });
          continue;
        }
        seenEmails.add(row.email.toLowerCase());
      }

      if (seenPhones.has(row.phone)) {
        errors.push({ rowNumber: row.rowNumber, message: `Duplicate phone "${row.phone}" in file` });
        continue;
      }
      seenPhones.add(row.phone);
      validRows.push(row);
    }

    const batchCodes = Array.from(new Set(validRows.flatMap((row) => row.batchCodes)));
    const batchIdsByCode = await this.studentRepository.findBatchIdsByCodes(batchCodes, actor.organizationId);

    for (const row of validRows) {
      const missingBatchCodes = row.batchCodes.filter((code) => !batchIdsByCode.has(code));
      if (missingBatchCodes.length > 0) {
        errors.push({
          rowNumber: row.rowNumber,
          message: `Unknown batch code(s): ${missingBatchCodes.join(', ')}`,
        });
      }
    }

    const eligibleRows = validRows.filter(
      (row) => !errors.some((error) => error.rowNumber === row.rowNumber),
    );

    if (eligibleRows.length === 0) {
      return {
        totalRows: rows.length,
        importedCount: 0,
        skippedCount: rows.length,
        errors,
      };
    }

    await this.organizationAccessService.assertStudentLimitNotReached(actor.organizationId, eligibleRows.length);

    const existingIdentifiers = await this.studentRepository.findExistingIdentifiers(
      eligibleRows.map((row) => row.email).filter((email): email is string => Boolean(email)),
      eligibleRows.map((row) => row.phone),
      actor.organizationId,
    );

    const importRows = eligibleRows.filter((row) => {
      const emailExists = row.email ? existingIdentifiers.emails.has(row.email) : false;
      const phoneExists = existingIdentifiers.phones.has(row.phone);

      if (emailExists || phoneExists) {
        errors.push({
          rowNumber: row.rowNumber,
          message: 'Student already exists with the same email or phone',
        });
        return false;
      }

      return true;
    });

    const importedCount = await this.studentRepository.createMany(importRows, batchIdsByCode, actor.organizationId);

    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'students',
      action: 'import',
      metadata: {
        totalRows: rows.length,
        importedCount,
        skippedCount: rows.length - importedCount,
        errorCount: errors.length,
      },
    });

    return {
      totalRows: rows.length,
      importedCount,
      skippedCount: rows.length - importedCount,
      errors,
    };
  }

  private async upsertPortalAccount(
    studentId: string,
    type: PortalAccountType,
    email: string | null,
    payload: { enabled?: boolean; password?: string },
  ) {
    const existing = await this.prisma.portalAccount.findUnique({
      where: {
        studentId_type: {
          studentId,
          type,
        },
      },
    });

    if (!existing && payload.enabled === undefined && !payload.password) {
      return null;
    }

    if (!email) {
      throw new NotFoundException(
        type === PortalAccountType.STUDENT
          ? 'Student email is required before enabling student portal access'
          : 'Guardian email is required before enabling parent portal access',
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!existing) {
      if (!payload.password) {
        throw new NotFoundException(
          type === PortalAccountType.STUDENT
            ? 'Student portal password is required to create the account'
            : 'Parent portal password is required to create the account',
        );
      }

      return this.prisma.portalAccount.create({
        data: {
          organizationId: (
            await this.prisma.student.findUniqueOrThrow({
              where: { id: studentId },
              select: { organizationId: true },
            })
          ).organizationId,
          studentId,
          type,
          email: normalizedEmail,
          passwordHash: await PasswordUtil.hash(payload.password),
          isActive: payload.enabled ?? true,
        },
        select: {
          id: true,
          email: true,
          isActive: true,
          lastLoginAt: true,
        },
      });
    }

    return this.prisma.portalAccount.update({
      where: { id: existing.id },
      data: {
        email: normalizedEmail,
        isActive: payload.enabled ?? existing.isActive,
        passwordHash: payload.password ? await PasswordUtil.hash(payload.password) : undefined,
      },
      select: {
        id: true,
        email: true,
        isActive: true,
        lastLoginAt: true,
      },
    });
  }
}
