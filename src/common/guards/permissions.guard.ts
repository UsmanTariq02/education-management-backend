import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { CurrentUserContext } from '../interfaces/current-user.interface';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    if (!this.configService.get('features.onlineClassesEnabled', { infer: true })) {
      const isOnlineClassesPermission = requiredPermissions.some((permission) => permission.startsWith('online-classes.'));
      if (isOnlineClassesPermission) {
        throw new ForbiddenException('Online classes are temporarily disabled');
      }
    }

    const request = context.switchToHttp().getRequest<{ user: CurrentUserContext }>();
    const currentUser = await this.prisma.user.findUnique({
      where: { id: request.user.userId },
      select: {
        id: true,
        email: true,
        isActive: true,
        organizationId: true,
        organization: {
          select: {
            id: true,
            name: true,
            userLimit: true,
            studentLimit: true,
            enabledModules: true,
          },
        },
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                rolePermissions: {
                  select: {
                    permission: {
                      select: {
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!currentUser || !currentUser.isActive) {
      throw new UnauthorizedException('User is inactive');
    }

    request.user = {
      ...request.user,
      organizationId: currentUser.organizationId,
      organizationName: currentUser.organization?.name ?? null,
      userLimit: currentUser.organization?.userLimit ?? null,
      studentLimit: currentUser.organization?.studentLimit ?? null,
      enabledModules: (currentUser.organization?.enabledModules as CurrentUserContext['enabledModules']) ?? [],
      roles: currentUser.userRoles.map((item) => item.role.name),
      permissions: Array.from(
        new Set(currentUser.userRoles.flatMap((item) => item.role.rolePermissions.map((entry) => entry.permission.name))),
      ),
    };

    if (request.user.roles.includes('SUPER_ADMIN')) {
      return true;
    }

    if (requiredPermissions.every((permission) => request.user.permissions.includes(permission))) {
      return true;
    }

    throw new ForbiddenException('Insufficient permissions');
  }
}
