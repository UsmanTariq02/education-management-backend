import { PortalAccountType, StudentStatus } from '@prisma/client';

export interface PortalAuthenticatedUser {
  accountId: string;
  studentId: string;
  organizationId: string;
  organizationName: string;
  hasOpenAiApiKey: boolean;
  hasTrialAiAccess: boolean;
  email: string;
  accountType: PortalAccountType;
  studentName: string;
  guardianName: string;
  batches: string[];
  studentStatus: StudentStatus;
}
