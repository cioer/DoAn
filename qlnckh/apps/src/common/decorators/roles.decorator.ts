import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Roles Decorator Key
 * Used by RolesGuard to retrieve required roles
 */
export const ROLES_KEY = 'roles';

/**
 * Require Roles Decorator
 *
 * Specifies which roles are allowed to access a route.
 * Used in conjunction with RolesGuard.
 *
 * @param roles - One or more UserRole values
 *
 * @example
 * @RequireRoles(UserRole.ADMIN)
 * @Get()
 * async adminOnly() { ... }
 *
 * @example - Multiple roles (user must have ONE of)
 * @RequireRoles(UserRole.ADMIN, UserRole.PHONG_KHCN)
 * @Post()
 * async adminOrKhcn() { ... }
 */
export const RequireRoles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
