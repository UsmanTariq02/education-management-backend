import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../../common/interfaces/paginated-result.interface';
import { buildPagination } from '../../../common/utils/pagination.util';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserRepository, UserWithAuthorization } from '../interfaces/user.repository.interface';

const authorizationInclude = {
  organization: {
    select: {
      id: true,
      name: true,
      isActive: true,
      userLimit: true,
      studentLimit: true,
      enabledModules: true,
    },
  },
  userRoles: {
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.UserInclude;

@Injectable()
export class UserPrismaRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmailWithAuthorization(email: string): Promise<UserWithAuthorization | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: authorizationInclude,
    });
  }

  async findByIdWithAuthorization(id: string): Promise<UserWithAuthorization | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: authorizationInclude,
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async findMany(query: PaginationQueryDto, organizationId?: string): Promise<PaginatedResult<UserWithAuthorization>> {
    const where: Prisma.UserWhereInput = {
      ...(organizationId ? { organizationId } : {}),
      ...(query.search
        ? {
            OR: [
              { firstName: { contains: query.search, mode: 'insensitive' } },
              { lastName: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: authorizationInclude,
        ...buildPagination(query),
        orderBy: {
          [query.sortBy ?? 'createdAt']: query.sortOrder,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  async create(payload: CreateUserDto, passwordHash: string, organizationId: string | null): Promise<UserWithAuthorization> {
    return this.prisma.user.create({
      data: {
        organizationId,
        firstName: payload.firstName,
        lastName: payload.lastName,
        email: payload.email,
        passwordHash,
        isActive: payload.isActive,
        userRoles: {
          createMany: {
            data: payload.roleIds.map((roleId) => ({ roleId })),
          },
        },
      },
      include: authorizationInclude,
    });
  }

  async update(id: string, payload: UpdateUserDto, organizationId?: string): Promise<UserWithAuthorization> {
    return this.prisma.$transaction(async (prisma) => {
      if (organizationId) {
        await prisma.user.findFirstOrThrow({
          where: {
            id,
            organizationId,
          },
          select: { id: true },
        });
      }

      if (payload.roleIds) {
        await prisma.userRole.deleteMany({ where: { userId: id } });
      }

      return prisma.user.update({
        where: { id },
        data: {
          firstName: payload.firstName,
          lastName: payload.lastName,
          email: payload.email,
          isActive: payload.isActive,
          passwordHash: payload.password,
          userRoles: payload.roleIds
            ? {
                createMany: {
                  data: payload.roleIds.map((roleId) => ({ roleId })),
                },
              }
            : undefined,
        },
        include: authorizationInclude,
      });
    });
  }

  async delete(id: string, organizationId?: string): Promise<void> {
    if (organizationId) {
      await this.prisma.user.findFirstOrThrow({
        where: {
          id,
          organizationId,
        },
        select: { id: true },
      });
    }

    await this.prisma.user.delete({
      where: { id },
    });
  }

  async storeRefreshToken(
    sessionId: string,
    userId: string,
    tokenHash: string,
    expiresAt: Date,
    metadata?: { ipAddress?: string | null; userAgent?: string | null; lastUsedAt?: Date | null },
  ): Promise<void> {
    await (this.prisma.refreshToken as never as { create(args: unknown): Promise<unknown> }).create({
      data: {
        id: sessionId,
        userId,
        tokenHash,
        expiresAt,
        ipAddress: metadata?.ipAddress ?? null,
        userAgent: metadata?.userAgent ?? null,
        lastUsedAt: metadata?.lastUsedAt ?? null,
      },
    });
  }

  async findActiveRefreshTokenById(tokenId: string, userId: string): Promise<{ id: string; tokenHash: string } | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        id: tokenId,
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      select: {
        id: true,
        tokenHash: true,
      },
    });
  }

  async findActiveSessionsByUserId(userId: string): Promise<Array<{
    id: string;
    ipAddress: string | null;
    userAgent: string | null;
    lastUsedAt: Date | null;
    createdAt: Date;
    expiresAt: Date;
    revokedAt: Date | null;
    revocationReason: string | null;
  }>> {
    return (this.prisma.refreshToken as never as { findMany(args: unknown): Promise<Array<{
      id: string;
      ipAddress: string | null;
      userAgent: string | null;
      lastUsedAt: Date | null;
      createdAt: Date;
      expiresAt: Date;
      revokedAt: Date | null;
      revocationReason: string | null;
    }>> }).findMany({
      where: { userId },
      orderBy: [{ revokedAt: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
        revokedAt: true,
        revocationReason: true,
      },
    });
  }

  async revokeRefreshToken(tokenId: string, reason?: string): Promise<void> {
    await (this.prisma.refreshToken as never as { update(args: unknown): Promise<unknown> }).update({
      where: { id: tokenId },
      data: { revokedAt: new Date(), revocationReason: reason ?? null },
    });
  }

  async revokeActiveRefreshTokensByUserId(userId: string, reason?: string): Promise<void> {
    await (this.prisma.refreshToken as never as { updateMany(args: unknown): Promise<unknown> }).updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
        revocationReason: reason ?? null,
      },
    });
  }

  async createLoginEvent(payload: {
    userId?: string | null;
    organizationId?: string | null;
    email: string;
    status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'LOGOUT' | 'REFRESH' | 'SESSION_REVOKED';
    ipAddress?: string | null;
    userAgent?: string | null;
    failureReason?: string | null;
  }): Promise<void> {
    await ((this.prisma as never as { userLoginEvent: { create(args: unknown): Promise<unknown> } }).userLoginEvent).create({
      data: {
        userId: payload.userId ?? null,
        organizationId: payload.organizationId ?? null,
        email: payload.email,
        status: payload.status,
        ipAddress: payload.ipAddress ?? null,
        userAgent: payload.userAgent ?? null,
        failureReason: payload.failureReason ?? null,
      },
    });
  }

  async countRecentFailedLoginEvents(email: string, since: Date): Promise<number> {
    return ((this.prisma as never as { userLoginEvent: { count(args: unknown): Promise<number> } }).userLoginEvent).count({
      where: {
        email,
        status: { in: ['FAILED', 'BLOCKED'] },
        createdAt: { gte: since },
      },
    });
  }

  async findRecentLoginEventsByUserId(
    userId: string,
    limit: number,
  ): Promise<Array<{
    id: string;
    email: string;
    status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'LOGOUT' | 'REFRESH' | 'SESSION_REVOKED';
    ipAddress: string | null;
    userAgent: string | null;
    failureReason: string | null;
    createdAt: Date;
  }>> {
    return ((this.prisma as never as { userLoginEvent: { findMany(args: unknown): Promise<Array<{
      id: string;
      email: string;
      status: 'SUCCESS' | 'FAILED' | 'BLOCKED' | 'LOGOUT' | 'REFRESH' | 'SESSION_REVOKED';
      ipAddress: string | null;
      userAgent: string | null;
      failureReason: string | null;
      createdAt: Date;
    }>> } }).userLoginEvent).findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        email: true,
        status: true,
        ipAddress: true,
        userAgent: true,
        failureReason: true,
        createdAt: true,
      },
    });
  }
}
