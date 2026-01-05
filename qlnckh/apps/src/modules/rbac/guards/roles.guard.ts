import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac.service';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

/**
 * Roles Guard
 *
 * Guards routes based on required user roles.
 * Use with @RequireRoles() decorator.
 *
 * @example
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * @RequireRoles(UserRole.ADMIN, UserRole.PHONG_KHCN)
 * async adminAction() { ... }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required roles from decorator metadata
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles required, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Get user from request
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException({
        success: false,
        error: {
          error_code: 'FORBIDDEN',
          message: 'Bạn chưa đăng nhập',
        },
      });
    }

    // Check if user's role is in the required roles
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException({
        success: false,
        error: {
          error_code: 'FORBIDDEN',
          message: 'Bạn không có quyền thực hiện hành động này',
          required_roles: requiredRoles,
        },
      });
    }

    return true;
  }
}
