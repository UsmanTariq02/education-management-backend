import { PortalAccountType } from '@prisma/client';

export interface CurrentPortalUserContext {
  accountId: string;
  studentId: string;
  organizationId: string;
  organizationName: string;
  email: string;
  accountType: PortalAccountType;
}
