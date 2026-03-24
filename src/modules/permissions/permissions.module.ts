import { Module } from '@nestjs/common';
import { PERMISSION_REPOSITORY } from '../../common/constants/injection-tokens';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { PermissionPrismaRepository } from './repositories/permission-prisma.repository';

@Module({
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    {
      provide: PERMISSION_REPOSITORY,
      useClass: PermissionPrismaRepository,
    },
  ],
  exports: [PERMISSION_REPOSITORY, PermissionsService],
})
export class PermissionsModule {}
