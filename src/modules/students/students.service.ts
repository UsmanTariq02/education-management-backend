import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { STUDENT_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentImportSummary } from './interfaces/student-import.interface';
import { StudentRepository } from './interfaces/student.repository.interface';
import { parseStudentCsv, studentImportSampleCsv } from './utils/student-import.util';

@Injectable()
export class StudentsService {
  constructor(
    @Inject(STUDENT_REPOSITORY)
    private readonly studentRepository: StudentRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(payload: CreateStudentDto, actor: CurrentUserContext) {
    if (!actor.organizationId) {
      throw new NotFoundException('Organization context is required');
    }
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
}
