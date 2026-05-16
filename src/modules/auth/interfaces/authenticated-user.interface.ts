import { OrganizationModule } from '../../../common/enums/organization-module.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string | null;
  organizationName: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
  userLimit: number | null;
  studentLimit: number | null;
  hasOpenAiApiKey: boolean;
  hasTrialAiAccess: boolean;
  enabledModules: OrganizationModule[];
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
}
