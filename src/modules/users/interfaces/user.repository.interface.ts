import { User } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

export type UserWithAuthorization = User & {
  organization: {
    id: string;
    name: string;
    isActive: boolean;
    userLimit: number;
    studentLimit: number;
    enabledModules: string[];
  } | null;
  userRoles: Array<{
    role: {
      id: string;
      name: string;
      rolePermissions: Array<{ permission: { id: string; name: string } }>;
    };
  }>;
};

export interface UserRepository {
  findByEmailWithAuthorization(email: string): Promise<UserWithAuthorization | null>;
  findByIdWithAuthorization(id: string): Promise<UserWithAuthorization | null>;
  findById(id: string): Promise<User | null>;
  findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<UserWithAuthorization>>;
  create(payload: CreateUserDto, passwordHash: string, organizationId: string | null): Promise<UserWithAuthorization>;
  update(id: string, payload: UpdateUserDto, organizationId?: string): Promise<UserWithAuthorization>;
  delete(id: string, organizationId?: string): Promise<void>;
  storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void>;
  findActiveRefreshTokenByUserId(userId: string): Promise<{ id: string; tokenHash: string } | null>;
  revokeRefreshToken(tokenId: string): Promise<void>;
  revokeActiveRefreshTokensByUserId(userId: string): Promise<void>;
}
