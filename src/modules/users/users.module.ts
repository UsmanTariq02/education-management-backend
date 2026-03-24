import { Module } from '@nestjs/common';
import { USER_REPOSITORY } from '../../common/constants/injection-tokens';
import { RolesModule } from '../roles/roles.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserPrismaRepository } from './repositories/user-prisma.repository';

@Module({
  imports: [RolesModule],
  controllers: [UsersController],
  providers: [
    UsersService,
    {
      provide: USER_REPOSITORY,
      useClass: UserPrismaRepository,
    },
  ],
  exports: [USER_REPOSITORY, UsersService],
})
export class UsersModule {}
