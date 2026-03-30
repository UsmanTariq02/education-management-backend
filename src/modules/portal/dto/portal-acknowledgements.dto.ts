export interface PortalAcknowledgementItemDto {
  itemKey: string;
  kind: 'FEE_DUE' | 'ASSIGNMENT_FEEDBACK' | 'ASSESSMENT_RESULT' | 'EXAM_RESULT';
  title: string;
  description: string;
  occurredAt: Date;
  acknowledgedAt: Date | null;
  actorName: string | null;
  subjectName: string | null;
  scoreLabel: string | null;
}

export interface AcknowledgePortalItemDto {
  itemKey: string;
  kind: string;
  title: string;
}
