import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Permission } from '../../shared/types/permissions';
import { Button } from '../ui';

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
  const { user, actingAs, isAuthenticated, logout, getEffectiveUser, hasPermission } = useAuthStore();

  if (!isAuthenticated) {
    return null;
  }

  const effectiveUser = getEffectiveUser();
  const displayName = effectiveUser?.displayName || 'Người dùng';

  // Check navigation permissions
  const canViewDashboard = effectiveUser?.role === 'PHONG_KHCN' || effectiveUser?.role === 'ADMIN';
  const canViewCalendar = hasPermission(Permission.CALENDAR_MANAGE);
  const canViewBulkOps = effectiveUser?.role === 'PHONG_KHCN' || effectiveUser?.role === 'ADMIN';
  const canViewAuditLog = hasPermission(Permission.AUDIT_VIEW);
  const canViewFormTemplates = hasPermission(Permission.FORM_TEMPLATE_IMPORT);
  const canViewImport = effectiveUser?.role === 'ADMIN'; // Story 10.1: Import Excel - ADMIN only
  const canManageUsers = hasPermission(Permission.USER_MANAGE);

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/auth/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left side: App title and Navigation */}
          <div className="flex items-center gap-6">
            <h1 className="text-xl font-bold text-gray-900">
              Hệ thống Quản lý NCKH
            </h1>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-4">
              <button
                onClick={() => navigate('/proposals')}
                className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
              >
                Đề tài
              </button>

              {canViewDashboard && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Dashboard
                </button>
              )}

              {canViewCalendar && (
                <button
                  onClick={() => navigate('/calendar')}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Lịch làm việc
                </button>
              )}

              {canViewBulkOps && (
                <button
                  onClick={() => navigate('/bulk-operations')}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Tác vụ hàng loạt
                </button>
              )}

              {canViewAuditLog && (
                <button
                  onClick={() => navigate('/audit')}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Nhật ký
                </button>
              )}

              {canViewFormTemplates && (
                <button
                  onClick={() => navigate('/form-templates')}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Biểu mẫu
                </button>
              )}

              {canViewImport && (
                <button
                  onClick={() => navigate('/admin/import')}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Import
                </button>
              )}

              {canManageUsers && (
                <button
                  onClick={() => navigate('/admin/users')}
                  className="text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
                >
                  Quản trị
                </button>
              )}
            </nav>
          </div>

          {/* Right side: User info, Logout */}
          <div className="flex items-center gap-4">
            {/* User info */}
            <div className="text-sm text-gray-700">
              <span className="font-medium">{displayName}</span>
              {actingAs && user && (
                <span className="ml-2 text-gray-500">
                  (thật: {user.displayName})
                </span>
              )}
            </div>

            {/* Logout button - using Button component */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
            >
              Đăng xuất
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
