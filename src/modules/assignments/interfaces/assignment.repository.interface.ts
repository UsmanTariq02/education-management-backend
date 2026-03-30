import { AssignmentStatus, AssignmentSubmissionStatus } from '.prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateAssignmentDto } from '../dto/create-assignment.dto';
import { UpdateAssignmentDto } from '../dto/update-assignment.dto';

export interface AssignmentSubmissionView {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string | null;
  status: AssignmentSubmissionStatus;
  submissionText: string | null;
  attachmentLinks: string[];
  submittedAt: Date | null;
  reviewedAt: Date | null;
  feedback: string | null;
  awardedMarks: number | null;
  reviewedByTeacherId: string | null;
  reviewedByTeacherName: string | null;
}

export interface AssignmentView {
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
  status: AssignmentStatus;
  maxMarks: number;
  dueAt: Date;
  allowLateSubmission: boolean;
  publishedAt: Date | null;
  submissionCount: number;
  reviewedCount: number;
  submissions: AssignmentSubmissionView[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PortalAssignmentSubmissionView {
  id: string;
  status: AssignmentSubmissionStatus;
  submissionText: string | null;
  attachmentLinks: string[];
  submittedAt: Date | null;
  reviewedAt: Date | null;
  feedback: string | null;
  awardedMarks: number | null;
  reviewedByTeacherName: string | null;
}

export interface PortalAssignmentView {
  id: string;
  title: string;
  code: string;
  description: string | null;
  instructions: string | null;
  subjectName: string;
  batchName: string;
  teacherName: string | null;
  status: AssignmentStatus;
  maxMarks: number;
  dueAt: Date;
  allowLateSubmission: boolean;
  canSubmit: boolean;
  submission: PortalAssignmentSubmissionView | null;
}

export interface AssignmentRepository {
  create(payload: CreateAssignmentDto, organizationId: string): Promise<AssignmentView>;
  findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<AssignmentView>>;
  findById(id: string): Promise<AssignmentView | null>;
  update(id: string, payload: UpdateAssignmentDto, organizationId?: string): Promise<AssignmentView>;
  delete(id: string, organizationId?: string): Promise<void>;
  reviewSubmission(
    submissionId: string,
    payload: { feedback?: string; awardedMarks?: number; finalize: boolean },
    actorUserId: string,
    organizationId?: string,
  ): Promise<AssignmentSubmissionView>;
}
