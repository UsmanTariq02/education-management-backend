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
  findReviewQueue(assessmentId: string, organizationId?: string): Promise<AssessmentReviewQueueView | null>;
  reviewAttempt(
    attemptId: string,
    payload: {
      answers: Array<{
        answerId: string;
        awardedMarks: number;
        isCorrect?: boolean;
        feedback?: string;
      }>;
      finalize: boolean;
    },
    actorUserId: string,
    organizationId?: string,
  ): Promise<AssessmentReviewAttemptView>;
  findAnalytics(assessmentId: string, organizationId?: string): Promise<AssessmentAnalyticsView | null>;
}

export interface AssessmentReviewAnswerView {
  id: string;
  questionId: string;
  prompt: string;
  type: AssessmentQuestionType;
  maxMarks: number;
  answerText: string | null;
  selectedOptionText: string | null;
  awardedMarks: number | null;
  isCorrect: boolean | null;
  feedback: string | null;
  reviewedAt: Date | null;
}

export interface AssessmentReviewAttemptView {
  attemptId: string;
  assessmentId: string;
  studentId: string;
  studentName: string;
  status: string;
  attemptNumber: number;
  submittedAt: Date | null;
  requiresManualReview: boolean;
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
  resultStatus: string;
  answers: AssessmentReviewAnswerView[];
}

export interface AssessmentReviewQueueView {
  assessmentId: string;
  assessmentTitle: string;
  totalAttempts: number;
  reviewPendingAttempts: number;
  completedAttempts: number;
  attempts: AssessmentReviewAttemptView[];
}

export interface AssessmentAnalyticsView {
  assessmentId: string;
  assessmentTitle: string;
  totalAttempts: number;
  completedAttempts: number;
  averageScore: number;
  averagePercentage: number;
  passRate: number;
  topScore: number | null;
  lowestScore: number | null;
  questionBreakdown: Array<{
    questionId: string;
    prompt: string;
    type: AssessmentQuestionType;
    maxMarks: number;
    averageAwardedMarks: number;
    correctResponses: number;
    attemptedResponses: number;
    accuracyRate: number;
  }>;
}
