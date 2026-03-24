import { OrganizationModule } from '../../../common/enums/organization-module.enum';

export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string | null;
  organizationName: string | null;
  userLimit: number | null;
  studentLimit: number | null;
  enabledModules: OrganizationModule[];
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
}
