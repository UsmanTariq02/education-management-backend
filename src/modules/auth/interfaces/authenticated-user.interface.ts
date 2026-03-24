export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string | null;
  organizationName: string | null;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles: string[];
  permissions: string[];
}
