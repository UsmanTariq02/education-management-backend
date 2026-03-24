import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUserContext } from '../interfaces/current-user.interface';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserContext => {
    const request = context.switchToHttp().getRequest<{ user: CurrentUserContext }>();
    return request.user;
  },
);
