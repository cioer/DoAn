import { SetMetadata } from '@nestjs/common';
import { Permission } from '../../modules/rbac/permissions.enum';

/**
 * Permissions Decorator Key
 * Used by PermissionsGuard to retrieve required permissions
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Any Permissions Decorator Key
 * Used by AnyPermissionsGuard to retrieve required permissions (OR logic)
 */
export const ANY_PERMISSIONS_KEY = 'any_permissions';

/**
 * Require Permissions Decorator
 *
 * Specifies which permissions are required to access a route.
 * Used in conjunction with PermissionsGuard.
 * User must have ALL specified permissions.
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

/**
 * Require Any Permissions Decorator
 *
 * Specifies which permissions grant access to a route.
 * Used in conjunction with AnyPermissionsGuard.
 * User must have AT LEAST ONE of the specified permissions.
 *
 * This is useful when multiple permissions can grant the same access,
 * such as USER_MANAGE (admin) or FACULTY_USER_MANAGE (QUAN_LY_KHOA).
 *
 * @param permissions - One or more Permission values (user needs ANY of these)
 *
 * @example
 * @RequireAnyPermissions(Permission.USER_MANAGE, Permission.FACULTY_USER_MANAGE)
 * @Get()
 * async findAll() { ... }
 */
export const RequireAnyPermissions = (...permissions: Permission[]) =>
  SetMetadata(ANY_PERMISSIONS_KEY, permissions);
