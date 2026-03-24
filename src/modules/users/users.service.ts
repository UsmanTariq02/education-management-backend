import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { USER_REPOSITORY } from '../../common/constants/injection-tokens';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PaginatedResult } from '../../common/interfaces/paginated-result.interface';
import { AuditLogService } from '../../common/services/audit-log.service';
import { PasswordUtil } from '../../common/utils/password.util';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { RolesService } from '../roles/roles.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserRepository, UserWithAuthorization } from './interfaces/user.repository.interface';

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly rolesService: RolesService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(payload: CreateUserDto, actor: CurrentUserContext): Promise<UserResponseDto> {
    const scopedOrganizationId = this.resolveScopedOrganizationId(actor);
    await this.assertAssignableRoleIds(payload.roleIds, actor);
    const passwordHash = await PasswordUtil.hash(payload.password);
    const organizationId: string | null = actor.roles.includes('SUPER_ADMIN')
      ? payload.organizationId ?? null
      : scopedOrganizationId ?? null;
    const user = await this.userRepository.create(payload, passwordHash, organizationId);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'users',
      action: 'create',
      targetId: user.id,
      metadata: { email: user.email, roles: user.userRoles.map((item) => item.role.name), isActive: user.isActive },
    });
    return this.toResponse(user);
  }

  async findAll(query: PaginationQueryDto, actor: CurrentUserContext): Promise<PaginatedResult<UserResponseDto>> {
    const scopedOrganizationId = this.resolveScopedOrganizationId(actor);
    const result = await this.userRepository.findMany(
      query,
      actor.roles.includes('SUPER_ADMIN') ? undefined : scopedOrganizationId,
    );
    return {
      ...result,
      items: result.items.map((item) => this.toResponse(item)),
    };
  }

  async findOne(id: string, actor: CurrentUserContext): Promise<UserResponseDto> {
    const scopedOrganizationId = this.resolveScopedOrganizationId(actor);
    const user = await this.userRepository.findByIdWithAuthorization(id);
    if (!user || (!actor.roles.includes('SUPER_ADMIN') && user.organizationId !== scopedOrganizationId)) {
      throw new NotFoundException('User not found');
    }
    return this.toResponse(user);
  }

  async update(id: string, payload: UpdateUserDto, actor: CurrentUserContext): Promise<UserResponseDto> {
    const scopedOrganizationId = this.resolveScopedOrganizationId(actor);
    const existingUser = await this.userRepository.findByIdWithAuthorization(id);
    if (!existingUser || (!actor.roles.includes('SUPER_ADMIN') && existingUser.organizationId !== scopedOrganizationId)) {
      throw new NotFoundException('User not found');
    }
    this.assertManageableTarget(existingUser, actor);

    const updatePayload: UpdateUserDto = { ...payload };
    if (payload.password) {
      updatePayload.password = await PasswordUtil.hash(payload.password);
    }
    if (payload.roleIds) {
      await this.assertAssignableRoleIds(payload.roleIds, actor);
    }

    const user = await this.userRepository.update(
      id,
      updatePayload,
      actor.roles.includes('SUPER_ADMIN') ? undefined : scopedOrganizationId,
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'users',
      action: 'update',
      targetId: id,
      metadata: {
        email: user.email,
        roles: user.userRoles.map((item) => item.role.name),
        isActive: user.isActive,
      },
    });
    return this.toResponse(user);
  }

  async delete(id: string, actor: CurrentUserContext): Promise<void> {
    const scopedOrganizationId = this.resolveScopedOrganizationId(actor);
    const existingUser = await this.userRepository.findByIdWithAuthorization(id);
    if (!existingUser || (!actor.roles.includes('SUPER_ADMIN') && existingUser.organizationId !== scopedOrganizationId)) {
      throw new NotFoundException('User not found');
    }
    this.assertManageableTarget(existingUser, actor);

    await this.userRepository.delete(
      id,
      actor.roles.includes('SUPER_ADMIN') ? undefined : scopedOrganizationId,
    );
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'users',
      action: 'delete',
      targetId: id,
      metadata: { deleted: true },
    });
  }

  private toResponse(user: UserWithAuthorization): UserResponseDto {
    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      organizationId: user.organizationId,
      organizationName: user.organization?.name ?? null,
      isActive: user.isActive,
      roles: user.userRoles.map((item) => item.role.name),
      permissions: Array.from(
        new Set(user.userRoles.flatMap((item) => item.role.rolePermissions.map((entry) => entry.permission.name))),
      ),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private resolveScopedOrganizationId(actor: CurrentUserContext): string | undefined {
    if (actor.roles.includes('SUPER_ADMIN')) {
      return undefined;
    }

    if (!actor.organizationId) {
      throw new ForbiddenException('Organization scope is required for this operation');
    }

    return actor.organizationId;
  }

  private async assertAssignableRoleIds(roleIds: string[], actor: CurrentUserContext): Promise<void> {
    if (actor.roles.includes('SUPER_ADMIN')) {
      return;
    }

    const roles = await this.rolesService.findAll();
    const requestedRoles = roles.filter((role) => roleIds.includes(role.id));
    const allowedRoleNames = this.getAssignableRoleNames(actor);

    if (
      requestedRoles.length !== roleIds.length ||
      requestedRoles.some((role) => !allowedRoleNames.has(role.name))
    ) {
      throw new ForbiddenException('You are not allowed to assign one or more selected roles');
    }
  }

  private assertManageableTarget(user: UserWithAuthorization, actor: CurrentUserContext): void {
    if (actor.roles.includes('SUPER_ADMIN')) {
      return;
    }

    const allowedRoleNames = this.getAssignableRoleNames(actor);
    const targetRoleNames = user.userRoles.map((item) => item.role.name);

    if (targetRoleNames.some((roleName) => !allowedRoleNames.has(roleName))) {
      throw new ForbiddenException('You are not allowed to manage this user');
    }
  }

  private getAssignableRoleNames(actor: CurrentUserContext): Set<string> {
    if (actor.roles.includes('SUPER_ADMIN')) {
      return new Set(['SUPER_ADMIN', 'ADMIN', 'STAFF']);
    }

    if (actor.roles.includes('ADMIN')) {
      return new Set(['ADMIN', 'STAFF']);
    }

    return new Set(['STAFF']);
  }
}
