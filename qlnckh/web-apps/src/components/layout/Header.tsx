import { useAuthStore } from '../../stores/authStore';
import { PersonaDropdown } from '../demo/PersonaDropdown';
import { ResetDemoButton } from '../demo/ResetDemoButton';

/**
 * Header Component
 *
 * Top navigation bar with:
 * - App title/logo
 * - User info
 * - Persona dropdown (demo mode only)
 * - Reset demo button (demo mode only)
 * - Logout button
 */
export function Header() {
  const { user, actingAs, isAuthenticated, logout, getEffectiveUser } = useAuthStore();

  if (!isAuthenticated) {
    return null;
  }

  const effectiveUser = getEffectiveUser();
  const displayName = effectiveUser?.displayName || 'Người dùng';

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
          {/* Left side: App title */}
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-gray-900">
              Hệ thống Quản lý NCKH
            </h1>
          </div>

          {/* Right side: User info, Persona dropdown, Reset Demo button, Logout */}
          <div className="flex items-center gap-4">
            {/* Persona dropdown (demo mode) */}
            <PersonaDropdown />

            {/* Reset Demo button (demo mode) */}
            <ResetDemoButton />

            {/* User info */}
            <div className="text-sm text-gray-700">
              <span className="font-medium">{displayName}</span>
              {actingAs && user && (
                <span className="ml-2 text-gray-500">
                  (thật: {user.displayName})
                </span>
              )}
            </div>

            {/* Logout button */}
            <button
              type="button"
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
