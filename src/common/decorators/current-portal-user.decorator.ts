import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentPortalUserContext } from '../interfaces/current-portal-user.interface';

export const CurrentPortalUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentPortalUserContext => {
    const request = context.switchToHttp().getRequest<{ portalUser: CurrentPortalUserContext }>();
    return request.portalUser;
  },
);
