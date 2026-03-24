import { Inject, Injectable } from '@nestjs/common';
import { Permission } from '@prisma/client';
import { PERMISSION_REPOSITORY } from '../../common/constants/injection-tokens';
import { PermissionRepository } from './interfaces/permission.repository.interface';

@Injectable()
export class PermissionsService {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissionRepository: PermissionRepository,
  ) {}

  async findAll(): Promise<Permission[]> {
    return this.permissionRepository.findAll();
  }
}
