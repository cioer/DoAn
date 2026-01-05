import { SetMetadata } from '@nestjs/common';
import { Permission } from '../../modules/rbac/permissions.enum';

/**
 * Permissions Decorator Key
 * Used by PermissionsGuard to retrieve required permissions
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Require Permissions Decorator
 *
 * Specifies which permissions are required to access a route.
 * Used in conjunction with PermissionsGuard.
 *
 * @param permissions - One or more Permission values
 *
 * @example
 * @RequirePermissions(Permission.USER_MANAGE)
 * @Get()
 * async findAll() { ... }
 *
 * @example - Multiple permissions (user must have ALL)
 * @RequirePermissions(Permission.USER_MANAGE, Permission.CALENDAR_MANAGE)
 * @Post()
 * async create() { ... }
 */
export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
