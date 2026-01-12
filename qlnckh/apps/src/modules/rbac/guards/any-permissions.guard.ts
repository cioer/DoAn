import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac.service';
import { ANY_PERMISSIONS_KEY } from '../../../common/decorators/permissions.decorator';
import { Permission } from '../permissions.enum';

/**
 * Any Permissions Guard
 *
 * Guards routes based on required permissions using OR logic.
 * User must have AT LEAST ONE of the specified permissions.
 * Use with @RequireAnyPermissions() decorator.
 *
 * This is useful when multiple permissions can grant the same access,
 * such as USER_MANAGE (admin) or FACULTY_USER_MANAGE (QUAN_LY_KHOA).
 *
 * @example
 * @UseGuards(JwtAuthGuard, AnyPermissionsGuard)
 * @RequireAnyPermissions(Permission.USER_MANAGE, Permission.FACULTY_USER_MANAGE)
 * @Get()
 * async findAll() { ... }
 */
@Injectable()
export class AnyPermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator metadata
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      ANY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no permissions required, allow access
    if (!requiredPermissions || requiredPermissions.length === 0) {
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

    // Check if user has ANY of the required permissions (OR logic)
    const hasAnyPermission = await this.rbacService.hasAnyPermission(
      user.role,
      requiredPermissions,
    );

    if (!hasAnyPermission) {
      throw new ForbiddenException({
        success: false,
        error: {
          error_code: 'FORBIDDEN',
          message: 'Bạn không có quyền thực hiện hành động này',
          required_permissions: requiredPermissions,
        },
      });
    }

    return true;
  }
}
