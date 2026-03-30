export interface PortalReportCardDto {
  studentId: string;
  studentName: string;
  batchName: string;
  batchCode: string;
  overallPercentage: number;
  overallGrade: string;
  examPercentage: number | null;
  assessmentPercentage: number | null;
  assignmentPercentage: number | null;
  publishedExamCount: number;
  finalizedAssessmentCount: number;
  reviewedAssignmentCount: number;
  subjectBreakdown: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    examPercentage: number | null;
    assessmentPercentage: number | null;
    assignmentPercentage: number | null;
    combinedPercentage: number | null;
  }>;
}
