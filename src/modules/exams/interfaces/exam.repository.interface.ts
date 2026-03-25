import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateExamDto } from '../dto/create-exam.dto';
import { UpdateExamDto } from '../dto/update-exam.dto';

export interface ExamSubjectView {
  id: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  totalMarks: number;
  passMarks: number;
}

export interface ExamView {
  id: string;
  organizationId: string;
  organizationName: string;
  academicSessionId: string | null;
  academicSessionName: string | null;
  batchId: string;
  batchName: string;
  batchCode: string;
  teacherId: string | null;
  teacherName: string | null;
  name: string;
  code: string;
  description: string | null;
  examDate: Date;
  isPublished: boolean;
  subjects: ExamSubjectView[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ExamRepository {
  create(payload: CreateExamDto, organizationId: string): Promise<ExamView>;
  findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<ExamView>>;
  findById(id: string): Promise<ExamView | null>;
  update(id: string, payload: UpdateExamDto, organizationId?: string): Promise<ExamView>;
  delete(id: string, organizationId?: string): Promise<void>;
}
