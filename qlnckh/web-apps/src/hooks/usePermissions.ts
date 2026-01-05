import { useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Permission } from '../shared/types/permissions';
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  hasRole,
  getUserPermissions,
  isAdmin,
} from '../lib/rbac/permissions';

/**
 * usePermissions Hook
 *
 * Provides convenient permission checking methods for the current user.
 * Memoized for performance.
 *
 * @example
 * function MyComponent() {
 *   const { hasPermission, isAdmin } = usePermissions();
 *
 *   if (!hasPermission(Permission.USER_MANAGE)) {
 *     return null;
 *   }
 *
 *   return <AdminPanel />;
 * }
 */
export function usePermissions() {
  const user = useAuthStore((state) => state.user);

  return useMemo(
    () => ({
      /**
       * Check if user has a specific permission
       */
      hasPermission: (permission: Permission) => hasPermission(user, permission),

      /**
       * Check if user has any of the specified permissions
       */
      hasAnyPermission: (permissions: Permission[]) =>
        hasAnyPermission(user, permissions),

      /**
       * Check if user has all of the specified permissions
       */
      hasAllPermissions: (permissions: Permission[]) =>
        hasAllPermissions(user, permissions),

      /**
       * Check if user has a specific role
       */
      hasRole: (role: string) => hasRole(user, role),

      /**
       * Check if user is admin
       */
      isAdmin: () => isAdmin(user),

      /**
       * Get all permissions for the user
       */
      getPermissions: () => getUserPermissions(user),

      /**
       * Current user's permissions array
       */
      permissions: user?.permissions || [],

      /**
       * Current user's role
       */
      role: user?.role || null,
    }),
    [user],
  );
}
