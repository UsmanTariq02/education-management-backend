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

  async storeRefreshToken(userId: string, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  async findActiveRefreshTokenByUserId(userId: string): Promise<{ id: string; tokenHash: string } | null> {
    return this.prisma.refreshToken.findFirst({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tokenHash: true,
      },
    });
  }

  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: { revokedAt: new Date() },
    });
  }

  async revokeActiveRefreshTokensByUserId(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }
}
