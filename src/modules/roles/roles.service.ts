import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ROLE_REPOSITORY } from '../../common/constants/injection-tokens';
import { AuditLogService } from '../../common/services/audit-log.service';
import { CurrentUserContext } from '../../common/interfaces/current-user.interface';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { RoleRepository } from './interfaces/role.repository.interface';

@Injectable()
export class RolesService {
  constructor(
    @Inject(ROLE_REPOSITORY)
    private readonly roleRepository: RoleRepository,
    private readonly auditLogService: AuditLogService,
  ) {}

  async findAll() {
    return this.roleRepository.findAll();
  }

  async findOne(id: string) {
    const role = await this.roleRepository.findById(id);
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async create(payload: CreateRoleDto, actor: CurrentUserContext) {
    const role = await this.roleRepository.create(payload);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'roles',
      action: 'create',
      targetId: role.id,
      metadata: {
        name: role.name,
        permissionNames: role.rolePermissions.map((item) => item.permission.name),
      },
    });
    return role;
  }

  async update(id: string, payload: UpdateRoleDto, actor: CurrentUserContext) {
    const role = await this.roleRepository.update(id, payload);
    await this.auditLogService.log({
      actorUserId: actor.userId,
      module: 'roles',
      action: 'update',
      targetId: role.id,
      metadata: {
        name: role.name,
        permissionNames: role.rolePermissions.map((item) => item.permission.name),
      },
    });
    return role;
  }
}
