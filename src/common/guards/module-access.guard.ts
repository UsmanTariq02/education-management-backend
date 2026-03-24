import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MODULE_ACCESS_KEY } from '../decorators/module-access.decorator';
import { CurrentUserContext } from '../interfaces/current-user.interface';
import { OrganizationModule } from '../enums/organization-module.enum';
import { OrganizationAccessService } from '../services/organization-access.service';

@Injectable()
export class ModuleAccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly organizationAccessService: OrganizationAccessService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredModule = this.reflector.getAllAndOverride<OrganizationModule | undefined>(MODULE_ACCESS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredModule) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user: CurrentUserContext }>();
    await this.organizationAccessService.assertActorCanAccessModule(request.user, requiredModule);
    return true;
  }
}
