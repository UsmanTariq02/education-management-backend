import { UnauthorizedException, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentPortalUserContext } from '../interfaces/current-portal-user.interface';

export const CurrentPortalUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentPortalUserContext => {
    const request = context.switchToHttp().getRequest<{
      portalUser?: CurrentPortalUserContext;
      user?: CurrentPortalUserContext;
    }>();

    const actor = request.portalUser ?? request.user;

    if (!actor) {
      throw new UnauthorizedException('Portal authentication context is missing');
    }

    return actor;
  },
);
