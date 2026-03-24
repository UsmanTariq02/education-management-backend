export interface CurrentUserContext {
  userId: string;
  email: string;
  organizationId: string | null;
  organizationName: string | null;
  roles: string[];
  permissions: string[];
}
