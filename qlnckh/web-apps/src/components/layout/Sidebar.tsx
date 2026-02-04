import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Permission } from '../../shared/types/permissions';
import {
  Home,
  FileText,
  Users,
  Calendar,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  GraduationCap,
  Shield,
  Briefcase,
  Building2,
  ClipboardList,
  Layers,
  FileUp,
  Upload,
  Key,
  X
} from 'lucide-react';
import { ReactNode, useState } from 'react';
import { useSidebar } from './SidebarContext';
import { ChangePasswordModal } from '../account';

/**
 * NavItem Component - Sidebar navigation item with Modern Soft UI
 */
const NavItem = ({
  children,
  onClick,
  isActive,
  icon: Icon,
  color = 'blue',
  collapsed
}: {
  children: ReactNode;
  onClick: () => void;
  isActive: boolean;
  color?: 'blue' | 'emerald' | 'indigo' | 'purple' | 'orange';
  icon: any;
  collapsed?: boolean;
}) => {
  const activeClasses = {
    blue: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-soft-md',
    emerald: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-soft-md',
    indigo: 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-soft-md',
    purple: 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-soft-md',
    orange: 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-soft-md',
  };

  const inactiveClasses = 'text-gray-600 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:text-gray-900';

  return (
    <button
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-[background,color,box-shadow] duration-200 min-h-[44px] ${
        isActive ? activeClasses[color] : inactiveClasses
      }`}
      title={collapsed ? String(children) : undefined}
    >
      <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-500'}`} />
      {!collapsed && (
        <span className="text-sm font-medium truncate">{children}</span>
      )}
    </button>
  );
};

/**
 * Sidebar Section Header
 */
const SidebarSection = ({
  children,
  collapsed
}: {
  children: ReactNode;
  collapsed?: boolean;
}) => {
  if (collapsed) return null;
  return (
    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-2 mt-4 mb-1">
      {children}
    </div>
  );
};

/**
 * Sidebar Component - Modern Soft UI Admin Sidebar
 * Supports both desktop (fixed sidebar) and mobile (drawer overlay)
 */
export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, actingAs, isAuthenticated, logout, getEffectiveUser, hasPermission } = useAuthStore();
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebar();
  const [showChangePassword, setShowChangePassword] = useState(false);

  if (!isAuthenticated) {
    return null;
  }

  // Close mobile drawer when navigating
  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

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
  const canViewFacultyDashboard = hasPermission(Permission.FACULTY_DASHBOARD_VIEW) && effectiveUser?.role !== 'ADMIN';
  const canViewCalendar = hasPermission(Permission.CALENDAR_MANAGE);
  const canViewBulkOps = effectiveUser?.role === 'PHONG_KHCN' || effectiveUser?.role === 'ADMIN';
  const canViewAuditLog = hasPermission(Permission.AUDIT_VIEW);
  const canViewFormTemplates = hasPermission(Permission.FORM_TEMPLATE_IMPORT);
  const canViewCouncils = effectiveUser?.role === 'PHONG_KHCN' || effectiveUser?.role === 'ADMIN';
  const canViewFacultyCouncils = effectiveUser?.role === 'QUAN_LY_KHOA';
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

  // Sidebar content (shared between desktop and mobile)
  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Logo Section */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200/50 flex-shrink-0">
        {isMobile || !collapsed ? (
          <button
            type="button"
            className="flex items-center gap-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl"
            onClick={() => handleNavigate('/')}
            aria-label="Trang chủ NCKH"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-soft-lg">
              QL
            </div>
            <div className="text-left">
              <h1 className="text-base font-bold text-gray-900 tracking-tight">
                NCKH
              </h1>
              <p className="text-xs text-gray-500">Quản lý NCKH</p>
            </div>
          </button>
        ) : (
          <button
            type="button"
            className="flex items-center justify-center w-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 rounded-xl"
            onClick={() => handleNavigate('/')}
            aria-label="Trang chủ NCKH"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-soft-lg">
              QL
            </div>
          </button>
        )}
        {isMobile ? (
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        ) : (
          <button
            onClick={toggleCollapsed}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors hidden lg:flex"
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            )}
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1 custom-scrollbar">
        {/* Main Navigation */}
        <SidebarSection collapsed={!isMobile && collapsed}>Menu chính</SidebarSection>

        <NavItem
          onClick={() => handleNavigate('/proposals')}
          isActive={isActive('/proposals')}
          icon={FileText}
          color="blue"
          collapsed={!isMobile && collapsed}
        >
          Đề tài
        </NavItem>

        {canViewResearcherDashboard && (
          <NavItem
            onClick={() => handleNavigate('/dashboard/researcher')}
            isActive={isActive('/dashboard/researcher')}
            icon={LayoutDashboard}
            color="indigo"
            collapsed={!isMobile && collapsed}
          >
            Dashboard
          </NavItem>
        )}

        {canViewFacultyDashboard && (
          <NavItem
            onClick={() => handleNavigate('/dashboard/faculty')}
            isActive={isActive('/dashboard/faculty')}
            icon={Building2}
            color="blue"
            collapsed={!isMobile && collapsed}
          >
            Khoa
          </NavItem>
        )}

        {canViewFacultyCouncils && (
          <NavItem
            onClick={() => handleNavigate('/faculty/councils')}
            isActive={isActive('/faculty/councils')}
            icon={Users}
            color="indigo"
            collapsed={!isMobile && collapsed}
          >
            Hội đồng khoa
          </NavItem>
        )}

        {canViewBghDashboard && (
          <NavItem
            onClick={() => handleNavigate('/dashboard/bgh')}
            isActive={isActive('/dashboard/bgh')}
            icon={Shield}
            color="emerald"
            collapsed={!isMobile && collapsed}
          >
            Hiệu trưởng
          </NavItem>
        )}

        {canViewDashboard && (
          <NavItem
            onClick={() => handleNavigate('/dashboard')}
            isActive={isActive('/dashboard') && !isActive('/dashboard/')}
            icon={Home}
            color="blue"
            collapsed={!isMobile && collapsed}
          >
            Tổng quan
          </NavItem>
        )}

        {canViewCalendar && (
          <NavItem
            onClick={() => handleNavigate('/calendar')}
            isActive={isActive('/calendar')}
            icon={Calendar}
            color="purple"
            collapsed={!isMobile && collapsed}
          >
            Lịch
          </NavItem>
        )}

        {canViewCouncils && (
          <NavItem
            onClick={() => handleNavigate('/councils')}
            isActive={isActive('/councils')}
            icon={GraduationCap}
            color="indigo"
            collapsed={!isMobile && collapsed}
          >
            Hội đồng
          </NavItem>
        )}

        {/* Management Section */}
        {(canViewBulkOps || canViewAuditLog || canViewFormTemplates || canViewImport || canManageUsers) && (
          <SidebarSection collapsed={!isMobile && collapsed}>Quản trị</SidebarSection>
        )}

        {canManageUsers && (
          <NavItem
            onClick={() => handleNavigate('/admin/users')}
            isActive={isActive('/admin/users')}
            icon={Users}
            color="orange"
            collapsed={!isMobile && collapsed}
          >
            Quản lý người dùng
          </NavItem>
        )}

        {canViewAuditLog && (
          <NavItem
            onClick={() => handleNavigate('/audit')}
            isActive={isActive('/audit')}
            icon={ClipboardList}
            color="purple"
            collapsed={!isMobile && collapsed}
          >
            Nhật ký hệ thống
          </NavItem>
        )}

        {canViewFormTemplates && (
          <NavItem
            onClick={() => handleNavigate('/form-templates')}
            isActive={isActive('/form-templates')}
            icon={FileUp}
            color="indigo"
            collapsed={!isMobile && collapsed}
          >
            Biểu mẫu
          </NavItem>
        )}

        {canViewBulkOps && (
          <NavItem
            onClick={() => handleNavigate('/bulk-operations')}
            isActive={isActive('/bulk-operations')}
            icon={Layers}
            color="emerald"
            collapsed={!isMobile && collapsed}
          >
            Xử lý hàng loạt
          </NavItem>
        )}

        {canViewImport && (
          <NavItem
            onClick={() => handleNavigate('/admin/import')}
            isActive={isActive('/admin/import')}
            icon={Upload}
            color="blue"
            collapsed={!isMobile && collapsed}
          >
            Import dữ liệu
          </NavItem>
        )}
      </nav>

      {/* User Section - Fixed at bottom */}
      <div className="p-3 border-t border-gray-200/50 flex-shrink-0 mt-auto">
        {isMobile || !collapsed ? (
          <div className="flex items-center gap-3 p-2 rounded-xl bg-gradient-to-r from-gray-50 to-blue-50">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-soft">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-800 truncate">
                {displayName}
              </div>
              {actingAs && user && (
                <div className="text-xs text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded mt-0.5 truncate">
                  View: {user.displayName}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowChangePassword(true)}
              className="p-2 rounded-lg hover:bg-white transition-colors text-gray-500 hover:text-blue-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Đổi mật khẩu"
            >
              <Key className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-white transition-colors text-gray-500 hover:text-red-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-sm font-bold shadow-soft">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={() => setShowChangePassword(true)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-blue-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Đổi mật khẩu"
            >
              <Key className="w-4 h-4" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 hover:text-red-500 min-h-[44px] min-w-[44px] flex items-center justify-center"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile, z-[300] for fixed layer */}
      <aside
        className={`fixed left-0 top-0 h-full bg-white/90 backdrop-blur-xl border-r border-gray-200/50 shadow-soft-xl z-[300] transition-[width] duration-300 hidden lg:flex flex-col ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {sidebarContent(false)}
      </aside>

      {/* Mobile Drawer Overlay - z-[400] below modals (1000+) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[400] lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer - z-[450] above overlay but below modals */}
      <aside
        className={`fixed left-0 top-0 h-full w-72 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-soft-xl z-[450] transition-[transform] duration-300 ease-in-out flex flex-col lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent(true)}
      </aside>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </>
  );
}
