import { StudentExamResultStatus } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateExamResultDto } from '../dto/create-exam-result.dto';
import { UpdateExamResultDto } from '../dto/update-exam-result.dto';

export interface ExamResultItemView {
  id: string;
  examSubjectId: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  obtainedMarks: number;
  totalMarks: number;
  passMarks: number;
  grade: string | null;
  remarks: string | null;
}

export interface ExamResultView {
  id: string;
  organizationId: string;
  organizationName: string;
  academicSessionId: string | null;
  academicSessionName: string | null;
  examId: string;
  examName: string;
  examCode: string;
  studentId: string;
  studentName: string;
  batchId: string;
  batchName: string;
  totalObtained: number;
  percentage: number;
  grade: string | null;
  remarks: string | null;
  status: StudentExamResultStatus;
  publishedAt: Date | null;
  items: ExamResultItemView[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamResultRepository {
  create(payload: CreateExamResultDto, organizationId: string): Promise<ExamResultView>;
  findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<ExamResultView>>;
  findById(id: string): Promise<ExamResultView | null>;
  update(id: string, payload: UpdateExamResultDto, organizationId?: string): Promise<ExamResultView>;
  delete(id: string, organizationId?: string): Promise<void>;
}
