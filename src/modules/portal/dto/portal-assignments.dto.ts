export interface PortalAssignmentSubmissionDto {
  id: string;
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED';
  submissionText: string | null;
  attachmentLinks: string[];
  submittedAt: Date | null;
  reviewedAt: Date | null;
  feedback: string | null;
  awardedMarks: number | null;
  reviewedByTeacherName: string | null;
}

export interface PortalAssignmentListItemDto {
  id: string;
  title: string;
  code: string;
  subjectName: string;
  batchName: string;
  teacherName: string | null;
  maxMarks: number;
  dueAt: Date;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  allowLateSubmission: boolean;
  submission: PortalAssignmentSubmissionDto | null;
}

export interface PortalAssignmentDetailDto {
  id: string;
  title: string;
  code: string;
  description: string | null;
  instructions: string | null;
  subjectName: string;
  batchName: string;
  teacherName: string | null;
  maxMarks: number;
  dueAt: Date;
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED';
  allowLateSubmission: boolean;
  canSubmit: boolean;
  submission: PortalAssignmentSubmissionDto | null;
}
