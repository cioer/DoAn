import { ReactNode } from 'react';
import { UserRole } from '../../shared/types/auth';
import { usePermissions } from '../../hooks/usePermissions';

interface RoleGateProps {
  /**
   * Role required to render children
   */
  role: UserRole;

  /**
   * Fallback to render if user doesn't have role
   * @default null (renders nothing)
   */
  fallback?: ReactNode;

  /**
   * Content to render if user has role
   */
  children: ReactNode;
}

/**
 * RoleGate Component
 *
 * Conditionally renders children based on user's role.
 * Use this to hide/show UI elements based on roles.
 *
 * @example
 * <RoleGate role={UserRole.ADMIN}>
 *   <button>Xóa</button>
 * </RoleGate>
 *
 * @example - With fallback
 * <RoleGate
 *   role={UserRole.ADMIN}
 *   fallback={<span>Chỉ admin mới thấy</span>}
 * >
 *   <AdminPanel />
 * </RoleGate>
 */
export function RoleGate({ role, fallback = null, children }: RoleGateProps) {
  const { hasRole } = usePermissions();

  if (!hasRole(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * AnyRoleGate Component
 *
 * Renders children if user has ANY of the specified roles.
 */
interface AnyRoleGateProps {
  roles: UserRole[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function AnyRoleGate({
  roles,
  fallback = null,
  children,
}: AnyRoleGateProps) {
  const { role: userRole } = usePermissions();

  if (!userRole || !roles.includes(userRole as UserRole)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
