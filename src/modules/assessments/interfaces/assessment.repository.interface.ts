import { AssessmentQuestionType, AssessmentStatus, AssessmentType } from '.prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateAssessmentDto } from '../dto/create-assessment.dto';
import { UpdateAssessmentDto } from '../dto/update-assessment.dto';

export interface AssessmentQuestionOptionView {
  id: string;
  text: string;
  orderIndex: number;
  isCorrect: boolean;
}

export interface AssessmentQuestionView {
  id: string;
  type: AssessmentQuestionType;
  prompt: string;
  helperText: string | null;
  explanation: string | null;
  orderIndex: number;
  marks: number;
  acceptedAnswers: string[];
  correctBooleanAnswer: boolean | null;
  options: AssessmentQuestionOptionView[];
}

export interface AssessmentView {
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
  title: string;
  code: string;
  description: string | null;
  instructions: string | null;
  type: AssessmentType;
  status: AssessmentStatus;
  durationMinutes: number;
  totalMarks: number;
  passMarks: number;
  startsAt: Date | null;
  endsAt: Date | null;
  availableFrom: Date | null;
  availableUntil: Date | null;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultImmediately: boolean;
  allowMultipleAttempts: boolean;
  maxAttempts: number;
  negativeMarkingEnabled: boolean;
  negativeMarkingPerWrong: number | null;
  questionCount: number;
  questions: AssessmentQuestionView[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentRepository {
  create(payload: CreateAssessmentDto, organizationId: string): Promise<AssessmentView>;
  findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<AssessmentView>>;
  findById(id: string): Promise<AssessmentView | null>;
  update(id: string, payload: UpdateAssessmentDto, organizationId?: string): Promise<AssessmentView>;
  delete(id: string, organizationId?: string): Promise<void>;
}
