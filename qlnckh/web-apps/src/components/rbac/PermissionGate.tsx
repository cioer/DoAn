import { ReactNode } from 'react';
import { Permission } from '../../shared/types/permissions';
import { usePermissions } from '../../hooks/usePermissions';

interface PermissionGateProps {
  /**
   * Permission required to render children
   */
  permission: Permission;

  /**
   * Fallback to render if user lacks permission
   * @default null (renders nothing)
   */
  fallback?: ReactNode;

  /**
   * Content to render if user has permission
   */
  children: ReactNode;
}

/**
 * PermissionGate Component
 *
 * Conditionally renders children based on user's permissions.
 * Use this to hide/show UI elements based on permissions.
 *
 * @example
 * <PermissionGate permission={Permission.USER_MANAGE}>
 *   <button>Quản lý người dùng</button>
 * </PermissionGate>
 *
 * @example - With fallback
 * <PermissionGate
 *   permission={Permission.USER_MANAGE}
 *   fallback={<span>Bạn không có quyền</span>}
 * >
 *   <AdminPanel />
 * </PermissionGate>
 */
export function PermissionGate({
  permission,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { hasPermission } = usePermissions();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * AnyPermissionGate Component
 *
 * Renders children if user has ANY of the specified permissions.
 */
interface AnyPermissionGateProps {
  permissions: Permission[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function AnyPermissionGate({
  permissions,
  fallback = null,
  children,
}: AnyPermissionGateProps) {
  const { hasAnyPermission } = usePermissions();

  if (!hasAnyPermission(permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * AllPermissionsGate Component
 *
 * Renders children if user has ALL of the specified permissions.
 */
interface AllPermissionsGateProps {
  permissions: Permission[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function AllPermissionsGate({
  permissions,
  fallback = null,
  children,
}: AllPermissionsGateProps) {
  const { hasAllPermissions } = usePermissions();

  if (!hasAllPermissions(permissions)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
