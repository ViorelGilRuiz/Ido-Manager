import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUser } from '../types/current-user.type';

export const CurrentUserDecorator = createParamDecorator(
  (_: unknown, context: ExecutionContext): CurrentUser => {
    const request = context.switchToHttp().getRequest();
    return request.user as CurrentUser;
  },
);
