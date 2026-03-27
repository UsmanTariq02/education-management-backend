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
    subscriptionStatus: string;
    trialEndsAt: Date | null;
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
  storeRefreshToken(
    sessionId: string,
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    metadata?: { ipAddress?: string | null; userAgent?: string | null; lastUsedAt?: Date | null },
  ): Promise<void>;
  findActiveRefreshTokenById(tokenId: string, userId: string): Promise<{ id: string; tokenHash: string } | null>;
  findActiveSessionsByUserId(userId: string): Promise<Array<{
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    lastUsedAt: Date | null;
    createdAt: Date;
    expiresAt: Date;
    revokedAt: Date | null;
    revocationReason: string | null;
  }>>;
  revokeRefreshToken(tokenId: string, reason?: string): Promise<void>;
  revokeActiveRefreshTokensByUserId(userId: string, reason?: string): Promise<void>;
  createLoginEvent(payload: {
    userId?: string | null;
    organizationId?: string | null;
    email: string;
    status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'LOGOUT' | 'REFRESH' | 'SESSION_REVOKED';
    ipAddress?: string | null;
    userAgent?: string | null;
    failureReason?: string | null;
  }): Promise<void>;
  countRecentFailedLoginEvents(email: string, since: Date): Promise<number>;
  findRecentLoginEventsByUserId(userId: string, limit: number): Promise<Array<{
    id: string;
    email: string;
    status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'LOGOUT' | 'REFRESH' | 'SESSION_REVOKED';
    ipAddress: string | null;
    userAgent: string | null;
    failureReason: string | null;
    createdAt: Date;
  }>>;
}
