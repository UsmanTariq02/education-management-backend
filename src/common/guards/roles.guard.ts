import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { CurrentUserContext } from '../interfaces/current-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
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

    return requiredRoles.some((role) => request.user.roles.includes(role));
  }
}
