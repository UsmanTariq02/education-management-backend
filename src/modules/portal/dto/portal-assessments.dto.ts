export interface PortalAssessmentListItemDto {
  id: string;
  title: string;
  code: string;
  subjectName: string;
  batchName: string;
  type: 'QUIZ' | 'TEST' | 'ASSIGNMENT' | 'PRACTICE';
  durationMinutes: number;
  totalMarks: number;
  passMarks: number;
  startsAt: Date | null;
  endsAt: Date | null;
  availableFrom: Date | null;
  availableUntil: Date | null;
  showResultImmediately: boolean;
  questionCount: number;
  latestAttempt: {
    id: string;
    status: 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_GRADED' | 'REVIEW_PENDING' | 'COMPLETED';
    attemptNumber: number;
    submittedAt: Date | null;
    resultStatus: 'PROVISIONAL' | 'FINALIZED' | null;
    percentage: number | null;
  } | null;
}

export interface PortalAssessmentQuestionDto {
  id: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'FILL_IN_THE_BLANK' | 'SHORT_ANSWER' | 'LONG_ANSWER';
  prompt: string;
  helperText: string | null;
  orderIndex: number;
  marks: number;
  options: Array<{
    id: string;
    text: string;
    orderIndex: number;
  }>;
}

export interface PortalAssessmentAttemptAnswerDto {
  questionId: string;
  selectedOptionId: string | null;
  answerText: string | null;
  awardedMarks: number | null;
  isCorrect: boolean | null;
  feedback: string | null;
}

export interface PortalAssessmentAttemptDto {
  id: string;
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'AUTO_GRADED' | 'REVIEW_PENDING' | 'COMPLETED';
  attemptNumber: number;
  startedAt: Date;
  submittedAt: Date | null;
  requiresManualReview: boolean;
  obtainedMarks: number | null;
  totalMarks: number | null;
  percentage: number | null;
  resultStatus: 'PROVISIONAL' | 'FINALIZED' | null;
  answers: PortalAssessmentAttemptAnswerDto[];
}

export interface PortalAssessmentDetailDto {
  id: string;
  title: string;
  code: string;
  description: string | null;
  instructions: string | null;
  subjectName: string;
  batchName: string;
  type: 'QUIZ' | 'TEST' | 'ASSIGNMENT' | 'PRACTICE';
  durationMinutes: number;
  totalMarks: number;
  passMarks: number;
  startsAt: Date | null;
  endsAt: Date | null;
  availableFrom: Date | null;
  availableUntil: Date | null;
  showResultImmediately: boolean;
  allowMultipleAttempts: boolean;
  maxAttempts: number;
  questionCount: number;
  questions: PortalAssessmentQuestionDto[];
  activeAttempt: PortalAssessmentAttemptDto | null;
}

export interface SavePortalAssessmentAnswerInputDto {
  questionId: string;
  selectedOptionId?: string;
  answerText?: string;
}

export interface SavePortalAssessmentAttemptDto {
  answers: SavePortalAssessmentAnswerInputDto[];
}

export interface PortalAssessmentSubmitResultDto {
  attemptId: string;
  status: 'PROVISIONAL' | 'FINALIZED';
  requiresManualReview: boolean;
  obtainedMarks: number;
  totalMarks: number;
  percentage: number;
  correctAnswers: number;
  incorrectAnswers: number;
  unansweredCount: number;
  answers: PortalAssessmentAttemptAnswerDto[];
}
