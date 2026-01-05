import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Permission } from '../../shared/types/permissions';
import { UserRole } from '../../shared/types/auth';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  /**
   * Content to render if authorized
   */
  children: ReactNode;

  /**
   * Required permission to access route
   */
  permission?: Permission;

  /**
   * Required role to access route
   */
  role?: UserRole;

  /**
   * Redirect path if unauthorized
   * @default '/error/403'
   */
  fallbackPath?: string;

  /**
   * Show 403 page instead of redirect
   * @default true
   */
  showErrorPage?: boolean;
}

/**
 * RouteGuard Component
 *
 * Protects routes by checking user permissions or roles.
 * Redirects to 403 page if user lacks required access.
 *
 * @example - Permission-based
 * <Route path="/users" element={
 *   <RouteGuard permission={Permission.USER_MANAGE}>
 *     <UserList />
 *   </RouteGuard>
 * } />
 *
 * @example - Role-based
 * <Route path="/admin" element={
 *   <RouteGuard role={UserRole.ADMIN}>
 *     <AdminPanel />
 *   </RouteGuard>
 * } />
 */
export function RouteGuard({
  children,
  permission,
  role,
  fallbackPath = '/error/403',
  showErrorPage = true,
}: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const hasRole = useAuthStore((state) => state.hasRole);

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  // Check permission if specified
  if (permission && !hasPermission(permission)) {
    if (showErrorPage) {
      return <Navigate to={fallbackPath} replace />;
    }
    return <Navigate to="/" replace />;
  }

  // Check role if specified
  if (role && !hasRole(role)) {
    if (showErrorPage) {
      return <Navigate to={fallbackPath} replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

/**
 * AuthGuard Component
 *
 * Simple authentication check (no permission/role requirements).
 * Redirects to login if not authenticated.
 */
interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
}
