import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Parameter decorator that extracts the current authenticated user (or a
 * specific property of it) from the request object populated by JwtStrategy.
 *
 * Usage:
 *   @CurrentUser()           → full user object
 *   @CurrentUser('id')       → user.id
 *   @CurrentUser('companyId') → user.companyId
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);
