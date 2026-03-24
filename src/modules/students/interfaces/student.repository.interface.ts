import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateStudentDto } from '../dto/create-student.dto';
import { UpdateStudentDto } from '../dto/update-student.dto';
import { StudentImportRow } from './student-import.interface';

export interface StudentView {
  id: string;
  organizationId: string;
  organizationName: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string | null;
  phone: string;
  guardianName: string;
  guardianEmail: string | null;
  guardianPhone: string;
  address: string | null;
  dateOfBirth: Date | null;
  admissionDate: Date;
  status: string;
  batches: Array<{ id: string; name: string; code: string; status: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentRepository {
  create(payload: CreateStudentDto, organizationId: string): Promise<StudentView>;
  findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<StudentView>>;
  findById(id: string, organizationId?: string): Promise<StudentView | null>;
  update(id: string, payload: UpdateStudentDto, organizationId?: string): Promise<StudentView>;
  delete(id: string): Promise<void>;
  findExistingIdentifiers(emails: string[], phones: string[], organizationId: string): Promise<{
    emails: Set<string>;
    phones: Set<string>;
  }>;
  findBatchIdsByCodes(codes: string[], organizationId: string): Promise<Map<string, string>>;
  createMany(rows: StudentImportRow[], batchIdsByCode: Map<string, string>, organizationId: string): Promise<number>;
}
