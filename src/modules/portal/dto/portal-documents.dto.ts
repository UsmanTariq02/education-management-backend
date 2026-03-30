export interface PortalDocumentDto {
  id: string;
  title: string;
  kind: 'UPLOADED' | 'GENERATED';
  category: 'ACADEMIC' | 'STUDENT_RECORD';
  fileName: string;
  mimeType: string;
  createdAt: Date;
  description: string | null;
}
