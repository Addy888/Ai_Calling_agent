import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** Roles that have full system access and bypass all role restrictions. */
const SUPER_ROLES = ['super-admin'];

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.roles) {
      throw new ForbiddenException('User roles not found');
    }

    // Super-admin has full system access — passes all role-restricted endpoints.
    const isSuperAdmin = user.roles.some((userRole: any) =>
      SUPER_ROLES.includes(userRole.slug)
    );

    if (isSuperAdmin) {
      return true;
    }

    // For all other roles, enforce exact slug match.
    const hasRole = requiredRoles.some((role) =>
      user.roles?.some((userRole: any) => userRole.slug === role)
    );

    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
