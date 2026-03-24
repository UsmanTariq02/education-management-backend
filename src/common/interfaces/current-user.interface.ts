import { OrganizationModule } from '../enums/organization-module.enum';

export interface CurrentUserContext {
  userId: string;
  email: string;
  organizationId?: string | null;
  organizationName?: string | null;
  userLimit?: number | null;
  studentLimit?: number | null;
  enabledModules?: OrganizationModule[];
  roles: string[];
  permissions: string[];
}
