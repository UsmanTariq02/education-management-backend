import { Permission } from '@prisma/client';

export interface PermissionRepository {
  findAll(): Promise<Permission[]>;
}
