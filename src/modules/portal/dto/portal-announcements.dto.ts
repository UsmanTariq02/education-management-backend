export interface PortalAnnouncementDto {
  id: string;
  title: string;
  body: string;
  category: string;
  audience: 'STUDENT' | 'PARENT' | 'BOTH';
  isPinned: boolean;
  publishedAt: Date | null;
  expiresAt: Date | null;
}
