import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Permission } from '../../shared/types/permissions';
import { Button } from '../ui';
import { ReactNode } from 'react';

/**
 * NavItem Component
 * Helper for consistent navigation link styling with active state
 */
const NavItem = ({
  children,
  onClick,
  isActive,
  color = 'blue'
}: {
  children: ReactNode;
  onClick: () => void;
  isActive: boolean;
  color?: 'blue' | 'emerald' | 'indigo'
}) => {
  const activeClass = isActive
    ? `bg-${color}-50 text-${color}-700 font-semibold shadow-sm ring-1 ring-${color}-200`
    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900';

  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 rounded-lg text-sm transition-all duration-200 ${activeClass}`}
    >
      {children}
    </button>
  );
};

/**
 * Header Component
 *
 * Top navigation bar with:
 * - App title/logo
 * - Navigation links
 * - User info
 * - Logout button
 */
export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, actingAs, isAuthenticated, logout, getEffectiveUser, hasPermission } = useAuthStore();

  if (!isAuthenticated) {
    return null;
  }

  const effectiveUser = getEffectiveUser();
  const displayName = effectiveUser?.displayName || 'Người dùng';

  // Check navigation permissions
  const canViewDashboard = effectiveUser?.role === 'PHONG_KHCN' ||
    effectiveUser?.role === 'ADMIN' ||
    effectiveUser?.role === 'HOI_DONG' ||
    effectiveUser?.role === 'THU_KY_HOI_DONG';

  const canViewBghDashboard = (effectiveUser?.role === 'BAN_GIAM_HOC' || effectiveUser?.role === 'BGH') &&
    hasPermission(Permission.DASHBOARD_VIEW);

  const canViewResearcherDashboard = effectiveUser?.role === 'GIANG_VIEN' && hasPermission(Permission.DASHBOARD_VIEW);
  const canViewFacultyDashboard = hasPermission(Permission.FACULTY_DASHBOARD_VIEW);
  const canViewCalendar = hasPermission(Permission.CALENDAR_MANAGE);
  const canViewBulkOps = effectiveUser?.role === 'PHONG_KHCN' || effectiveUser?.role === 'ADMIN';
  const canViewAuditLog = hasPermission(Permission.AUDIT_VIEW);
  const canViewFormTemplates = hasPermission(Permission.FORM_TEMPLATE_IMPORT);
  const canViewCouncils = effectiveUser?.role === 'PHONG_KHCN' || effectiveUser?.role === 'ADMIN';
  const canViewImport = effectiveUser?.role === 'ADMIN';
  const canManageUsers = hasPermission(Permission.USER_MANAGE);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-sticky transition-all duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: App title and Navigation */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-soft">
                QL
              </div>
              <h1 className="text-lg font-bold text-gray-900 tracking-tight">
                NCKH
              </h1>
            </div>

            {/* Navigation links */}
            <nav className="hidden lg:flex items-center gap-1.5">
              <NavItem
                onClick={() => navigate('/proposals')}
                isActive={isActive('/proposals')}
              >
                Đề tài
              </NavItem>

              {canViewResearcherDashboard && (
                <NavItem
                  onClick={() => navigate('/dashboard/researcher')}
                  isActive={isActive('/dashboard/researcher')}
                >
                  Dashboard
                </NavItem>
              )}

              {canViewFacultyDashboard && (
                <NavItem
                  onClick={() => navigate('/dashboard/faculty')}
                  isActive={isActive('/dashboard/faculty')}
                >
                  Khoa
                </NavItem>
              )}

              {canViewBghDashboard && (
                <NavItem
                  onClick={() => navigate('/dashboard/bgh')}
                  isActive={isActive('/dashboard/bgh')}
                  color="emerald"
                >
                  Hiệu trưởng
                </NavItem>
              )}

              {canViewDashboard && (
                <NavItem
                  onClick={() => navigate('/dashboard')}
                  isActive={isActive('/dashboard') && !isActive('/dashboard/')}
                >
                  Tổng quan
                </NavItem>
              )}

              {canViewCalendar && (
                <NavItem
                  onClick={() => navigate('/calendar')}
                  isActive={isActive('/calendar')}
                >
                  Lịch
                </NavItem>
              )}

              {canViewCouncils && (
                <NavItem
                  onClick={() => navigate('/councils')}
                  isActive={isActive('/councils')}
                >
                  Hội đồng
                </NavItem>
              )}

              {/* Management Group */}
              {(canViewBulkOps || canViewAuditLog || canViewFormTemplates || canViewImport || canManageUsers) && (
                <div className="h-6 w-px bg-gray-200 mx-2" />
              )}

              {canManageUsers && (
                <NavItem
                  onClick={() => navigate('/admin/users')}
                  isActive={isActive('/admin/users')}
                >
                  Quản trị
                </NavItem>
              )}
            </nav>
          </div>

          {/* Right side: User info, Logout */}
          <div className="flex items-center gap-4">
            {/* User info */}
            <div className="text-sm text-right hidden sm:block">
              <div className="font-semibold text-gray-800">{displayName}</div>
              {actingAs && user && (
                <div className="text-xs text-indigo-500 font-medium bg-indigo-50 px-1.5 py-0.5 rounded ml-auto w-fit mt-0.5">
                  View: {user.displayName}
                </div>
              )}
            </div>

            {/* Logout button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
              className="!rounded-lg !px-3"
            >
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
