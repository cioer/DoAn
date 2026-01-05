import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Permission } from '../shared/types/permissions';
import LoginPage from './auth/login';
import ForbiddenPage from './error/403';
import UserManagementPage from './admin/users/page';

/**
 * AuthGuard Component
 *
 * Simple authentication check (no permission/role requirements).
 * Redirects to login if not authenticated.
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  return <>{children}</>;
}

/**
 * PermissionGuard Component
 *
 * Checks if user has required permission.
 * Redirects to 403 page if unauthorized.
 */
function PermissionGuard({
  children,
  permission,
}: {
  children: React.ReactNode;
  permission: Permission;
}) {
  const hasPermission = useAuthStore((state) => state.hasPermission);

  if (!hasPermission(permission)) {
    return <Navigate to="/error/403" replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Default route - redirect to users if authenticated, otherwise login */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <Navigate to="/admin/users" replace />
            </AuthGuard>
          }
        />

        {/* Auth routes */}
        <Route path="/auth/login" element={<LoginPage />} />

        {/* Admin routes - require permissions */}
        <Route
          path="/admin/users"
          element={
            <AuthGuard>
              <PermissionGuard permission={Permission.USER_MANAGE}>
                <UserManagementPage />
              </PermissionGuard>
            </AuthGuard>
          }
        />

        {/* Error routes */}
        <Route path="/error/403" element={<ForbiddenPage />} />

        {/* Catch all - 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
