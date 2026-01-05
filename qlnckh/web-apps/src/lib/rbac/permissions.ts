import { Permission } from '../../shared/types/permissions';
import { User } from '../../shared/types/auth';

/**
 * Check if user has a specific permission
 * @param user - User object with permissions array
 * @param permission - Permission to check
 * @returns True if user has the permission
 */
export function hasPermission(user: User | null, permission: Permission): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

/**
 * Check if user has any of the specified permissions
 * @param user - User object with permissions array
 * @param permissions - Array of permissions to check
 * @returns True if user has at least one of the permissions
 */
export function hasAnyPermission(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.some((permission) => user.permissions.includes(permission));
}

/**
 * Check if user has all of the specified permissions
 * @param user - User object with permissions array
 * @param permissions - Array of permissions to check
 * @returns True if user has all of the permissions
 */
export function hasAllPermissions(user: User | null, permissions: Permission[]): boolean {
  if (!user) return false;
  return permissions.every((permission) => user.permissions.includes(permission));
}

/**
 * Check if user has a specific role
 * @param user - User object
 * @param role - Role to check
 * @returns True if user has the role
 */
export function hasRole(user: User | null, role: string): boolean {
  if (!user) return false;
  return user.role === role;
}

/**
 * Get all permissions for a user
 * @param user - User object
 * @returns Array of permissions
 */
export function getUserPermissions(user: User | null): Permission[] {
  if (!user) return [];
  return user.permissions;
}

/**
 * Check if user is admin
 * @param user - User object
 * @returns True if user is admin
 */
export function isAdmin(user: User | null): boolean {
  return hasRole(user, 'ADMIN');
}
