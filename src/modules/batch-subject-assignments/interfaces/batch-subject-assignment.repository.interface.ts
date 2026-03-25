import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateBatchSubjectAssignmentDto } from '../dto/create-batch-subject-assignment.dto';
import { UpdateBatchSubjectAssignmentDto } from '../dto/update-batch-subject-assignment.dto';

export interface BatchSubjectAssignmentView {
  id: string;
  organizationId: string;
  organizationName: string;
  academicSessionId: string | null;
  academicSessionName: string | null;
  batchId: string;
  batchName: string;
  batchCode: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  teacherId: string | null;
  teacherName: string | null;
  weeklyClasses: number;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchSubjectAssignmentRepository {
  create(payload: CreateBatchSubjectAssignmentDto, organizationId: string): Promise<BatchSubjectAssignmentView>;
  findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<BatchSubjectAssignmentView>>;
  findById(id: string): Promise<BatchSubjectAssignmentView | null>;
  update(id: string, payload: UpdateBatchSubjectAssignmentDto, organizationId?: string): Promise<BatchSubjectAssignmentView>;
  delete(id: string, organizationId?: string): Promise<void>;
}
