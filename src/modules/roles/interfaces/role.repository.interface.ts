import { Role } from '@prisma/client';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';

export type RoleWithPermissions = Role & {
  rolePermissions: Array<{ permission: { id: string; name: string; description: string | null } }>;
};

export interface RoleRepository {
  findAll(): Promise<RoleWithPermissions[]>;
  findById(id: string): Promise<RoleWithPermissions | null>;
  create(payload: CreateRoleDto): Promise<RoleWithPermissions>;
  update(id: string, payload: UpdateRoleDto): Promise<RoleWithPermissions>;
}
