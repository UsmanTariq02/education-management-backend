export interface PortalActivityFeedItemDto {
  id: string;
  kind: 'REMINDER' | 'ASSIGNMENT_FEEDBACK' | 'ASSESSMENT_FEEDBACK' | 'RESULT_PUBLISHED';
  title: string;
  description: string;
  occurredAt: Date;
  status: string | null;
  subjectName: string | null;
  scoreLabel: string | null;
  actorName: string | null;
}
