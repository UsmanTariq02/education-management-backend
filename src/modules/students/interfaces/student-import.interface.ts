import { StudentStatus } from '@prisma/client';

export interface StudentImportRow {
  rowNumber: number;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  guardianName: string;
  guardianEmail?: string;
  guardianPhone: string;
  address?: string;
  dateOfBirth?: Date;
  admissionDate: Date;
  status: StudentStatus;
  batchCodes: string[];
}

export interface StudentImportError {
  rowNumber: number;
  message: string;
}

export interface StudentImportSummary {
  totalRows: number;
  importedCount: number;
  skippedCount: number;
  errors: StudentImportError[];
}
