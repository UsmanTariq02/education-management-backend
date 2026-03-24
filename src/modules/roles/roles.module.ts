import { Module } from '@nestjs/common';
import { ROLE_REPOSITORY } from '../../common/constants/injection-tokens';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { RolePrismaRepository } from './repositories/role-prisma.repository';

@Module({
  controllers: [RolesController],
  providers: [
    RolesService,
    {
      provide: ROLE_REPOSITORY,
      useClass: RolePrismaRepository,
    },
  ],
  exports: [ROLE_REPOSITORY, RolesService],
})
export class RolesModule {}
