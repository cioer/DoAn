import { useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useSidebar } from './SidebarContext';
import { useAuthStore } from '../../stores/authStore';

/**
 * Mobile Header Component
 *
 * Fixed header at top of screen on mobile devices with:
 * - Hamburger menu button to open sidebar drawer
 * - App logo/title
 * - Only visible on mobile (< lg breakpoint)
 */
export function MobileHeader() {
  const navigate = useNavigate();
  const { toggleMobileOpen } = useSidebar();
  const { isAuthenticated, getEffectiveUser } = useAuthStore();

  if (!isAuthenticated) {
    return null;
  }

  const effectiveUser = getEffectiveUser();
  const displayName = effectiveUser?.displayName || 'Người dùng';

  return (
    <header className="fixed top-0 left-0 right-0 h-14 bg-white/95 backdrop-blur-xl border-b border-gray-200/50 shadow-soft z-40 flex items-center justify-between px-3 lg:hidden">
      {/* Hamburger Menu Button */}
      <button
        onClick={toggleMobileOpen}
        className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        aria-label="Mở menu"
      >
        <Menu className="w-6 h-6 text-gray-700" />
      </button>

      {/* Logo/Title */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => navigate('/')}
      >
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-soft">
          QL
        </div>
        <h1 className="text-base font-bold text-gray-900 tracking-tight">
          NCKH
        </h1>
      </div>

      {/* User Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-soft">
        {displayName.charAt(0).toUpperCase()}
      </div>
    </header>
  );
}
