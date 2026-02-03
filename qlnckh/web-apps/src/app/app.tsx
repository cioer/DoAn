import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useAuthStore, useHasHydrated } from '../stores/authStore';
import { Permission } from '../shared/types/permissions';
import { Layout } from '../components/layout/Layout';

/**
 * User roles from Prisma schema
 */
enum UserRole {
  GIANG_VIEN = 'GIANG_VIEN',
  QUAN_LY_KHOA = 'QUAN_LY_KHOA',
  THU_KY_KHOA = 'THU_KY_KHOA',
  PHONG_KHCN = 'PHONG_KHCN',
  THU_KY_HOI_DONG = 'THU_KY_HOI_DONG',
  THANH_TRUNG = 'THANH_TRUNG',
  BAN_GIAM_HOC = 'BAN_GIAM_HOC',
  HOI_DONG = 'HOI_DONG',
  BGH = 'BGH',
  ADMIN = 'ADMIN',
}

/**
 * Lazy-loaded route components for code splitting
 *
 * Using React.lazy() to split code at the route level.
 * Each route's code is only loaded when the route is visited.
 */
const LoginPage = lazy(() => import('./auth/login'));
const ForbiddenPage = lazy(() => import('./error/403'));
const UserManagementPage = lazy(() => import('./admin/users/page'));
const ImportPage = lazy(() => import('./admin/import/page'));
const DashboardPage = lazy(() => import('./dashboard/page'));
const ResearcherDashboardPage = lazy(() => import('./dashboard/researcher/page'));
const FacultyDashboardPage = lazy(() => import('./dashboard/faculty/page'));
const BghDashboardPage = lazy(() => import('./dashboard/bgh/page'));
const FacultyUsersPage = lazy(() => import('./dashboard/faculty/users/page'));
const CalendarPage = lazy(() => import('./calendar/page'));
const BulkOperationsPage = lazy(() => import('./bulk-operations/page'));
const ProposalsPage = lazy(() => import('./proposals/page'));
const ProposalDetailPage = lazy(() => import('./proposals/[id]/page'));
const ProposalEditPage = lazy(() => import('./proposals/[id]/edit/page'));
const CreateProposalPage = lazy(() => import('./proposals/new/page'));
const AuditLogPage = lazy(() => import('./audit/page'));
const FormTemplatesPage = lazy(() => import('./form-templates/page'));
const CouncilsPage = lazy(() => import('./councils/page'));
const FacultyCouncilsPage = lazy(() => import('./faculty/councils/page'));

/**
 * Loading fallback component for lazy-loaded routes
 */
function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        <p className="mt-2 text-sm text-gray-600">Đang tải...</p>
      </div>
    </div>
  );
}

/**
 * Suspense wrapper for lazy-loaded components
 */
function LazyRoute({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      {children}
    </Suspense>
  );
}

/**
 * HydrationGuard Component
 *
 * Waits for zustand persist to hydrate before rendering children.
 * Prevents "flash" of incorrect auth state on page load.
 */
function HydrationGuard({ children }: { children: React.ReactNode }) {
  const hasHydrated = useHasHydrated();

  useEffect(() => {
    // Trigger hydration by accessing the store
    useAuthStore.persist.rehydrate();
  }, []);

  if (!hasHydrated) {
    return <RouteLoadingFallback />;
  }

  return <>{children}</>;
}

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

/**
 * RoleGuard Component
 *
 * Checks if user has required role.
 * Redirects to 403 page if unauthorized.
 */
function RoleGuard({
  children,
  allowedRoles,
}: {
  children: React.ReactNode;
  allowedRoles: UserRole[];
}) {
  const user = useAuthStore((state) => state.user);

  if (!user || !allowedRoles.includes(user.role as UserRole)) {
    return <Navigate to="/error/403" replace />;
  }

  return <>{children}</>;
}

/**
 * Default Landing Page Component
 *
 * Redirects users to appropriate dashboard based on their role:
 * - GIANG_VIEN → /dashboard/researcher (Lecturer dashboard)
 * - QUAN_LY_KHOA → /dashboard/faculty (Faculty dashboard)
 * - HOI_DONG, THU_KY_HOI_DONG → /dashboard (Council member dashboard)
 * - Others (PHONG_KHCN, ADMIN) → /dashboard (Admin dashboard)
 *
 * Uses useEffect for navigation to prevent redirect loops caused by
 * Navigate component triggering re-renders during render phase.
 */
function DefaultLandingPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Prevent double redirects
    if (isRedirecting) return;

    setIsRedirecting(true);

    if (!user) {
      navigate('/auth/login', { replace: true });
    } else if (user.role === UserRole.GIANG_VIEN) {
      // GIANG_VIEN gets their own dashboard
      navigate('/dashboard/researcher', { replace: true });
    } else if (user.role === UserRole.QUAN_LY_KHOA) {
      // QUAN_LY_KHOA gets faculty dashboard
      navigate('/dashboard/faculty', { replace: true });
    } else {
      // Council members, Admin/Department staff go to main dashboard
      navigate('/dashboard', { replace: true });
    }
  }, [user?.id, user?.role, navigate, isRedirecting]);

  return <RouteLoadingFallback />;
}

export function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <BrowserRouter>
      <HydrationGuard>
        <Layout>
          <Routes>
        {/* Default route - redirect based on user role */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <DefaultLandingPage />
            </AuthGuard>
          }
        />

        {/* Auth routes */}
        <Route
          path="/auth/login"
          element={
            <LazyRoute>
              <LoginPage />
            </LazyRoute>
          }
        />

        {/* Dashboard - Story 11.2 (Admin/PHONG_KHCN/Council Members) */}
        <Route
          path="/dashboard"
          element={
            <AuthGuard>
              <PermissionGuard permission={Permission.DASHBOARD_VIEW}>
                <LazyRoute>
                  <DashboardPage />
                </LazyRoute>
              </PermissionGuard>
            </AuthGuard>
          }
        />

        {/* Researcher Dashboard - GIANG_VIEN Feature */}
        <Route
          path="/dashboard/researcher"
          element={
            <AuthGuard>
              <PermissionGuard permission={Permission.DASHBOARD_VIEW}>
                <LazyRoute>
                  <ResearcherDashboardPage />
                </LazyRoute>
              </PermissionGuard>
            </AuthGuard>
          }
        />

        {/* Faculty Dashboard - QUAN_LY_KHOA Feature */}
        <Route
          path="/dashboard/faculty"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={[UserRole.QUAN_LY_KHOA]}>
                <PermissionGuard permission={Permission.FACULTY_DASHBOARD_VIEW}>
                  <LazyRoute>
                    <FacultyDashboardPage />
                  </LazyRoute>
                </PermissionGuard>
              </RoleGuard>
            </AuthGuard>
          }
        />

        {/* BAN_GIAM_HOC (Hiệu trưởng) Dashboard */}
        <Route
          path="/dashboard/bgh"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={[UserRole.BAN_GIAM_HOC, UserRole.BGH]}>
                <PermissionGuard permission={Permission.DASHBOARD_VIEW}>
                  <LazyRoute>
                    <BghDashboardPage />
                  </LazyRoute>
                </PermissionGuard>
              </RoleGuard>
            </AuthGuard>
          }
        />

        {/* Faculty User Management - QUAN_LY_KHOA Feature */}
        <Route
          path="/dashboard/faculty/users"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={[UserRole.QUAN_LY_KHOA]}>
                <PermissionGuard permission={Permission.FACULTY_USER_MANAGE}>
                  <LazyRoute>
                    <FacultyUsersPage />
                  </LazyRoute>
                </PermissionGuard>
              </RoleGuard>
            </AuthGuard>
          }
        />

        {/* Calendar Management - Story 1.8: Business Calendar (PHONG_KHCN) */}
        <Route
          path="/calendar"
          element={
            <AuthGuard>
              <PermissionGuard permission={Permission.CALENDAR_MANAGE}>
                <LazyRoute>
                  <CalendarPage />
                </LazyRoute>
              </PermissionGuard>
            </AuthGuard>
          }
        />

        {/* Bulk Operations - Story 8.1, 8.2 (PHONG_KHCN) */}
        <Route
          path="/bulk-operations"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={[UserRole.PHONG_KHCN, UserRole.ADMIN]}>
                <LazyRoute>
                  <BulkOperationsPage />
                </LazyRoute>
              </RoleGuard>
            </AuthGuard>
          }
        />

        {/* Proposals list - Story 11.3 */}
        <Route
          path="/proposals"
          element={
            <AuthGuard>
              <LazyRoute>
                <ProposalsPage />
              </LazyRoute>
            </AuthGuard>
          }
        />

        {/* Create proposal - Story 11.4 */}
        <Route
          path="/proposals/new"
          element={
            <AuthGuard>
              <PermissionGuard permission={Permission.PROPOSAL_CREATE}>
                <LazyRoute>
                  <CreateProposalPage />
                </LazyRoute>
              </PermissionGuard>
            </AuthGuard>
          }
        />

        {/* Admin routes - require permissions */}
        <Route
          path="/admin/users"
          element={
            <AuthGuard>
              <PermissionGuard permission={Permission.USER_MANAGE}>
                <LazyRoute>
                  <UserManagementPage />
                </LazyRoute>
              </PermissionGuard>
            </AuthGuard>
          }
        />

        {/* Import Excel - ADMIN only (Story 10.1) */}
        <Route
          path="/admin/import"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={[UserRole.ADMIN]}>
                <LazyRoute>
                  <ImportPage />
                </LazyRoute>
              </RoleGuard>
            </AuthGuard>
          }
        />

        {/* Audit Log Viewer - ADMIN only */}
        <Route
          path="/audit"
          element={
            <AuthGuard>
              <PermissionGuard permission={Permission.AUDIT_VIEW}>
                <LazyRoute>
                  <AuditLogPage />
                </LazyRoute>
              </PermissionGuard>
            </AuthGuard>
          }
        />

        {/* Form Templates Management - PHONG_KHCN/ADMIN */}
        <Route
          path="/form-templates"
          element={
            <AuthGuard>
              <PermissionGuard permission={Permission.FORM_TEMPLATE_IMPORT}>
                <LazyRoute>
                  <FormTemplatesPage />
                </LazyRoute>
              </PermissionGuard>
            </AuthGuard>
          }
        />

        {/* Councils Management - PHONG_KHCN/ADMIN */}
        <Route
          path="/councils"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={[UserRole.PHONG_KHCN, UserRole.ADMIN]}>
                <LazyRoute>
                  <CouncilsPage />
                </LazyRoute>
              </RoleGuard>
            </AuthGuard>
          }
        />

        {/* Faculty Councils Management - QUAN_LY_KHOA */}
        <Route
          path="/faculty/councils"
          element={
            <AuthGuard>
              <RoleGuard allowedRoles={[UserRole.QUAN_LY_KHOA]}>
                <PermissionGuard permission={Permission.FACULTY_DASHBOARD_VIEW}>
                  <LazyRoute>
                    <FacultyCouncilsPage />
                  </LazyRoute>
                </PermissionGuard>
              </RoleGuard>
            </AuthGuard>
          }
        />

        {/* Proposal detail - Story 11.5: View proposal with attachments */}
        <Route
          path="/proposals/:id"
          element={
            <AuthGuard>
              <LazyRoute>
                <ProposalDetailPage />
              </LazyRoute>
            </AuthGuard>
          }
        />

        {/* Proposal edit - require GIANG_VIEN role (Story 2.3) */}
        <Route
          path="/proposals/:id/edit"
          element={
            <AuthGuard>
              <PermissionGuard permission={Permission.PROPOSAL_EDIT}>
                <LazyRoute>
                  <ProposalEditPage />
                </LazyRoute>
              </PermissionGuard>
            </AuthGuard>
          }
        />

        {/* Error routes */}
        <Route
          path="/error/403"
          element={
            <LazyRoute>
              <ForbiddenPage />
            </LazyRoute>
          }
        />

        {/* Catch all - 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
        </Layout>
      </HydrationGuard>
    </BrowserRouter>
  );
}

export default App;
