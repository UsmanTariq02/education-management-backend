import { BadRequestException } from '@nestjs/common';
import { StudentStatus } from '@prisma/client';
import { StudentImportError, StudentImportRow } from '../interfaces/student-import.interface';

const requiredHeaders = [
  'firstName',
  'lastName',
  'phone',
  'guardianName',
  'guardianPhone',
  'admissionDate',
] as const;

const sampleRows = [
  [
    'firstName',
    'lastName',
    'email',
    'phone',
    'guardianName',
    'guardianEmail',
    'guardianPhone',
    'address',
    'dateOfBirth',
    'admissionDate',
    'status',
    'batchCodes',
  ].join(','),
  [
    'Ali',
    'Khan',
    'ali.khan@example.com',
    '03001234567',
    'Ahmed Khan',
    'ahmed.khan@example.com',
    '03007654321',
    'Street 1, Lahore',
    '2012-05-14',
    '2026-03-01',
    'ACTIVE',
    'BATCH-A|BATCH-B',
  ].join(','),
];

export const studentImportSampleCsv = `${sampleRows.join('\n')}\n`;

export function parseStudentCsv(buffer: Buffer): {
  rows: StudentImportRow[];
  errors: StudentImportError[];
} {
  const content = buffer.toString('utf-8').trim();

  if (!content) {
    throw new BadRequestException('CSV file is empty');
  }

  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const headers = parseCsvLine(lines[0]);

  for (const header of requiredHeaders) {
    if (!headers.includes(header)) {
      throw new BadRequestException(`CSV header "${header}" is required`);
    }
  }

  const rows: StudentImportRow[] = [];
  const errors: StudentImportError[] = [];

  lines.slice(1).forEach((line, index) => {
    const rowNumber = index + 2;
    const values = parseCsvLine(line);
    const entry = Object.fromEntries(headers.map((header, valueIndex) => [header, values[valueIndex]?.trim() ?? '']));

    const status = (entry.status || 'ACTIVE') as StudentStatus;
    const admissionDate = parseDate(entry.admissionDate);
    const dateOfBirth = entry.dateOfBirth ? parseDate(entry.dateOfBirth) : undefined;

    if (!entry.firstName || !entry.lastName || !entry.phone || !entry.guardianName || !entry.guardianPhone || !admissionDate) {
      errors.push({ rowNumber, message: 'Missing one or more required fields' });
      return;
    }

    if (!Object.values(StudentStatus).includes(status)) {
      errors.push({ rowNumber, message: `Invalid status "${entry.status}"` });
      return;
    }

    if (entry.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.email)) {
      errors.push({ rowNumber, message: `Invalid email "${entry.email}"` });
      return;
    }

    if (entry.guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(entry.guardianEmail)) {
      errors.push({ rowNumber, message: `Invalid guardian email "${entry.guardianEmail}"` });
      return;
    }

    rows.push({
      rowNumber,
      firstName: entry.firstName,
      lastName: entry.lastName,
      email: entry.email ? entry.email.toLowerCase() : undefined,
      phone: entry.phone,
      guardianName: entry.guardianName,
      guardianEmail: entry.guardianEmail ? entry.guardianEmail.toLowerCase() : undefined,
      guardianPhone: entry.guardianPhone,
      address: entry.address || undefined,
      dateOfBirth,
      admissionDate,
      status,
      batchCodes: entry.batchCodes
        ? entry.batchCodes
            .split('|')
            .map((value) => value.trim())
            .filter((value) => value.length > 0)
        : [],
    });
  });

  return { rows, errors };
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += character;
  }

  values.push(current);
  return values;
}

function parseDate(value: string): Date | undefined {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}
