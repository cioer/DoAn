import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RbacService } from '../rbac.service';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { Permission } from '../permissions.enum';

/**
 * Permissions Guard
 *
 * Guards routes based on required permissions.
 * Use with @RequirePermissions() decorator.
 *
 * @example
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * @RequirePermissions(Permission.USER_MANAGE)
 * async findAll() { ... }
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required permissions from decorator metadata
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
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

    // Check if user has ALL required permissions
    const hasAllPermissions = await this.rbacService.hasAllPermissions(
      user.role,
      requiredPermissions,
    );

    if (!hasAllPermissions) {
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
