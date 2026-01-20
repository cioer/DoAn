import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { SidebarProvider, useSidebar } from './SidebarContext';
import { useAuthStore } from '../../stores/authStore';
import { Chatbox } from '../ai-chat';

/**
 * Layout Content - Inner component that uses sidebar context
 */
function LayoutContent({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { collapsed } = useSidebar();

  return (
    <>
      {/* Sidebar - only show when authenticated */}
      {isAuthenticated && <Sidebar />}

      {/* Main Content - margin adjusts based on sidebar state */}
      <main
        className={`transition-all duration-300 ${
          isAuthenticated
            ? collapsed
              ? 'ml-20'
              : 'ml-64'
            : 'ml-0'
        }`}
      >
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* AI Chatbox - only show when authenticated */}
      {isAuthenticated && <Chatbox />}
    </>
  );
}

/**
 * Main Layout Component
 *
 * Provides the admin layout with:
 * - Fixed sidebar on the left (collapsible)
 * - Main content area that adjusts to sidebar state
 * - Proper spacing and scrolling
 */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      <SidebarProvider>
        <LayoutContent>{children}</LayoutContent>
      </SidebarProvider>
    </div>
  );
}

/**
 * Responsive Layout with collapsible sidebar support
 */
export function ResponsiveLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-indigo-50/20">
      <SidebarProvider>
        <Sidebar />
        <main className="ml-64 transition-all duration-300">
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </SidebarProvider>
    </div>
  );
}
